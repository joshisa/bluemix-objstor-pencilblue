/*
    Copyright (C) 2016 IBM
    Shamelessly forked and modified from the S3-pencilblue plugin
*/

module.exports = function BMObjStorMediaProviderModule(pb) {
    //pb dependencies
    var util          = pb.util;
    var PluginService = pb.PluginService;
    var NpmPluginDependencyService = pb.NpmPluginDependencyService;
    var request       = NpmPluginDependencyService.require('bluemix-objstor-pencilblue', 'request');
    var jsonQuery = NpmPluginDependencyService.require('bluemix-objstor-pencilblue', 'json-query');
    //require('request').debug = true  Enables additional debug output via the Request module

    /**
     * Media provider to upload files to IBM Bluemix Object Storage
     * @class BMObjStorMediaProvider
     * @constructor
     * @implements MediaProvider
     */
    function BMObjStorMediaProvider(context) {
        /**
         *
         * @property pluginService
         * @type {PluginService}
         */
        this.pluginService = new PluginService(context);
    };

    /**
     * Retrieves the X-Auth-Token Openstack Swift access token.  This is necessary
     * to create new containers, add files and toggle resource ACLs.
     * @method getToken
     * @param {Function} cb A callback that provides parameters:
     * The first is an error, if it occurred.
     * The second is a JSON payload {"token":"", "url":"", "container":""}
     *
     * token:   Represents the Openstack Swift server generated X-Subject-Token response header
     * url:     Represents the Openstack Swift server generated public storage url for the given region
     * container: Represents the default/user provided container name defined in plugin settings
     */
    BMObjStorMediaProvider.prototype.getToken = function(cb) {
        this.pluginService.getSettingsKV('bluemix-objstor-pencilblue', function(err, setts) {
            if (util.isError(err)) {
                return cb(err);
            }

            var data = {
              "auth": {
                    "identity": {
                        "methods": [
                            "password"
                        ],
                        "password": {
                            "user": {
                                "id": setts.userId,
                                "password": setts.password
                            }
                        }
                    },
                    "scope": {
                        "project": {
                            "id": setts.projectId
                        }
                    }
                }
            }

            var res_handler = function(error, response, res_body) {
              var objstorbase = JSON.parse(res_body)
              // First filter cuts out everything from the response except the Swift object store section
              var endpoints = jsonQuery('token[**][name=swift & type=object-store]', {data:objstorbase}).value
              // Second filter drills down to the specific url representing a public interface within the provided region
              var objstorbaseurl = jsonQuery('endpoints[interface=public & region_id=' + setts.region_id + ']', {data:endpoints}).value.url

              var body = {};
              if (!error && response.statusCode == 201) {
                body = {"token": response.headers['x-subject-token'],
                        "url": objstorbaseurl,
                        "container": setts.container};

                // Persisting token to cache.  Typically a 20 hour (72000 secs) expiration timeout
                pb.cache.setex('bluemix-objstor-info', String(pb.config.cache.timeout), JSON.stringify(body), function(err, result) {
                    if (util.isError(err)) {
                      pb.log.debug(err)
                    }
                    pb.log.info("PencilBlue: Bluemix: Persisting object storage X-Auth-Token with a " + String(pb.config.cache.timeout) " seconds expiration timeout...")
                });
                cb(null, body);
              }
              else {
                body = {"token": error, "url": ""};
                cb(null, error);
              };
            };

            // Setting up the request to retrieve an X-Auth-Token
            var req_options = {
              url: setts.auth_url,
              headers: {'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache',
                        'Content-Length': Buffer.byteLength(JSON.stringify(data))},
              timeout: 100000,
              method: 'POST',
              body: JSON.stringify(data)
            };

            // Detecting if previous token exists and has already been cached
            pb.cache.get('bluemix-objstor-info', function(err, result){
              if (util.isError(err)) {
                  return cb(err, null);
              }
              if (result == null) {
                pb.log.info("PencilBlue: Bluemix: Cache Retrieval -- No X-Auth-Token discovered for reuse")
                request(req_options, res_handler);
              } else {
                pb.log.info("PencilBlue: Bluemix: Cache Retrieval -- Found an existing token");
                cb(null,JSON.parse(result));
              }
            });
        });
    };

    /**
     * Creates an IBM Bluemix Openstack Object Storage Container, if one does not already exist.
     * @method createContainer
     * @param {Object} Object Storage Instance Options {"token":"", "url":"", "container":""}
     * @param {Function} cb A callback that provides two parameters: 
     * An Error, if one occurred and the calculated/cached storage instance options
     */
    BMObjStorMediaProvider.prototype.createContainer = function(options, cb) {
       var res_handler = function(error, response, body) {
          if (!error) {
            pb.log.info("PencilBlue: Bluemix: " + options.container + " container successfully created.")
            cb(null, options)
          }
          else {
            cb(null, error)
          }
       };
       // Creating PUT request to create container with global public read ACL
       var req_options = {
            url: options.url + '/' + options.container,
            headers: {'accept': 'application/json',
                  'X-Auth-Token': options.token,
                  'x-container-read': '.r:*', 
                  'x-cdn-ttl': '1440'},
            timeout: 100000,
            method: 'PUT'
       };

       // Make request
       request(req_options, res_handler);
    };

    /**
     * Creates a "file" object within Object Storage
     * @method createFile
     * @param {String} param 
     * @param {Function} cb A callback that provides two parameters: 
     * An Error, if one occurred and the resulting url "path" to the "file" object
     * This path will take on a form similar to <objstor_url>/<container>/media/2016/11/<unique_guid>.PNG
     */
    BMObjStorMediaProvider.prototype.createFile = function(mediaPath, fileDataStrOrBuff, options, cb) {
           if (util.isFunction(options)) {
                cb = options;
                options = {};
            }
            else if (!util.isObject(options)) {
                return cb(new Error('The options parameter must be an object'));
            }

           // Constructing File Object URL
           // Object Storage URL + Target Container + Calculated FileData provided via upload
           mediaPath = options.url + '/' + options.container + mediaPath;
           var res_handler = function(error, response, body) {
              if (!error) {
                cb(null, mediaPath);
              }
              else {
                cb(error);
              }
           };

           var req_options = {
                url: mediaPath,
                headers: {'accept': 'application/json',
                          'X-Auth-Token': options.token},
                timeout: 100000,
                body: fileDataStrOrBuff,
                method: 'PUT'
           };
           request(req_options,res_handler);
    };

    /**
     * Constructs a readable stream to the provided mediaPath
     * @method createReadableStream
     * @param {String} param 
     * @param {Function} cb
     * TODO:  Need to add error handling
     */
    BMObjStorMediaProvider.prototype.createReadableStream = function(mediaPath, cb) {
      var res_handler = function(error, response, body) {
        if (error) {
          return cb(error);
        }
      };
      var req_options = {
            url: mediaPath,
            timeout: 100000,
            method: 'GET'
      };
      return request(req_options,res_handler);
    };

    /**
     * Higher level getter for a readable stream to the provided mediaPath
     * @method getStream
     * @param {String} param 
     * @param {Function} cb A callback that provides two parameters: 
     * An Error, if one occurred or
     * A readable stream
     */
    BMObjStorMediaProvider.prototype.getStream = function(mediaPath, cb) {
        var self = this;
        self.getToken(function(err, body) {
          mediaPath = body.url + '/' + body.container + mediaPath;
          self.exists(mediaPath, function(err, exists) {
            if (exists) {
              cb(null, self.createReadableStream(mediaPath));
            } else {
              cb(new Error('Media File does not exist!'));
            }
          }); //exists
        }); //getToken
    };

    /**
     * Throws an error because it is not implemented.
     * @method get
     * @param {String} param 
     * @param {Function} cb A callback that provides two parameters: 
     * Returns An Error
     */
    BMObjStorMediaProvider.prototype.get = function(mediaPath, cb) {
        throw new Error('get Not implemented!');
    };

    /**
     * Sets media content into Bluemix Object Storage based on the specified media path and 
     * options.  The stream provided must be a ReadableStream.  Entry point for MediaProvider
     * @method setStream
     * @param {ReadableStream} stream - The content stream
     * @param {String} mediaPath The path/key to the media.  Typically this will be a path
     * such as: /media/2015/10/77f75131-fcc9-456a-b423-f5ea05717a17-1444944578183.png
     * @param {Function} cb A callback that provides two parameters: 
     * Returns An Error, if one occurred
     * A url to the uploaded media
     * Boolean result status
     */
    BMObjStorMediaProvider.prototype.setStream = function(stream, mediaPath, options, cb) {
        // This is where the first dominoe tumbles
        var self = this;
        if (util.isFunction(options)) {
            cb      = options;
            options = {};
        }
        else if (!util.isObject(options)) {
            return cb(new Error('The options parameter must be an object'));
        }

        var buffers = [];
        stream.on('data', function(buffer) {
            buffers.push(buffer);
        });
        stream.on('end', function() {
            var buffer = Buffer.concat(buffers);
            self.set(buffer, mediaPath, options || {}, function(err, remoteURL, result){
              cb(null, remoteURL, true);
            });
        });

        stream.on('error', function(err) {
            cb(err);
        });
    };

    /**
     * Higher level setter to write data to a specific mediaPath within Object Storage
     * @method set
     * @param {String} param 
     * @param {Function} cb A callback that provides two parameters: 
     * Returns an Error, if one occurred or
     * Generated mediapath to the resource with an acknowledgement of creation success.
     */
    BMObjStorMediaProvider.prototype.set = function(fileDataStrOrBuff, mediaPath, options, cb) {
        var self = this;
        self.getToken(function(err, body) {
           self.createContainer(body, function(err, body) {
              self.createFile(mediaPath, fileDataStrOrBuff, body, function(err, mediaPath) {
                if (!err) {
                  pb.log.info("PencilBlue: Bluemix: File object successfully created within Bluemix Object Storage");
                  cb(null, mediaPath, true);
                } else {
                  pb.log.debug("Error during file creation");
                  cb(err, '', false);
                }
              });
           });
        });
    };

    /**
     * Throws an error because it is not implemented.
     * @method createWriteStream
     * @param {String} param 
     * @param {Function} cb A callback that provides two parameters: 
     * Returns an Error
     */
    BMObjStorMediaProvider.prototype.createWriteStream = function(mediaPath, cb) {
        throw new Error('createWriteStream Not implemented!');
    };

    /**
     * Tests for the presence of a particular mediaPath "file" object.
     * @method exists
     * @param {String} mediaPath  The path/key to the media.
     * @param {Function} cb A callback that provides two parameters: 
     * Returns an Error, if one occurred
     * A boolean indicating "file" object existence for provided mediaPath
     */
    BMObjStorMediaProvider.prototype.exists = function(mediaPath, cb) {
           var res_handler = function(error, response, body) {
              if (!error && response.statusCode == 200) {
                cb(null, true);
              }
              else if (!error) {
                cb(null, false);
              } else {
                cb (error, false);
              }
           };

           var req_options = {
                url: mediaPath,
                timeout: 100000,
                method: 'GET'
           };
           request(req_options,res_handler);
    };

    /**
     * Deletes a file out of Bluemix Object Storage
     * @method delete
     * @param {String} mediaPath The path/key to the media.  Typically this is a 
     * path such as: /media/2014/9/540a3ff0e30ddfb9e60000be-1409957872680.jpg
     * @param {String} [options.container] The Bluemix ObjStor Container to interact with
     * @param {Function} cb A callback that provides two parameters: 
     * Returns an Error, if one occurred and
     * The success of the operation
     */
     BMObjStorMediaProvider.prototype.delete = function(mediaPath, options, cb) {
        self = this;
        if (util.isFunction(options)) {
            cb      = options;
            options = {};
        }
        else if (!util.isObject(options)) {
            return cb(new Error('The options parameter must be an object'));
        }

        self.getToken(function(err, body) {
            mediaPath = body.url + '/' + body.container + mediaPath
            var res_handler = function(error, response, body) {
                if (!error) {
                  pb.log.info("PencilBlue: Bluemix: File object successfully deleted")
                  cb(null, true);
                } else {
                  cb (error, false);
                }
             };

            var req_options = {
                 url: mediaPath,
                 headers: {
                   'X-Auth-Token': body.token
                 },
                 timeout: 100000,
                 method: 'DELETE'
            };
            request(req_options,res_handler);
        });
    };

    /**
     * throw an error because it is not implemented.
     * @method stat
     * @param {String} param 
     * @param {Function} cb A callback that provides two parameters: An Error, if 
     * occurred and maybe something
     */
    BMObjStorMediaProvider.prototype.stat = function(mediaPath, cb) {
        pb.log.debug('BMObjStorMediaProvider: stat method fired');
        throw new Error('stat Not implemented!');
    };

    //exports
    return BMObjStorMediaProvider;
};
