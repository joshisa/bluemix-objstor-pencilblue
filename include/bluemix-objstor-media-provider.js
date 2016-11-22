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
    /**
     * Media provider to upload files to IBM Bluemix Object Storage v1
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
     * Retrieves 
     * @method getClient
     * @param {Function} cb A callback that provides parameters: The first an 
     * error, if occurred.  The second is a Bluemix Obj Stor instance for interfacing with 
     * Bluemix Object Storage.  The last parameter is the hash of the plugin settings.  
     * {"auth_uri":"", "userid":"", "password":"", "container":"", "projectid":""}
     */
    BMObjStorMediaProvider.prototype.getToken = function(cb) {
        var self = this;
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

            //require('request').debug = true
            var res_handler = function(error, response, res_body) {
              var objstorbase = JSON.parse(res_body)
              // Risky assumption that this will always remain in this position.  Need a more dynamic discovery.
              // var objstorbaseurl = (objstorbase.token.catalog[7].endpoints[2].interface == 'public')?objstorbase.token.catalog[7].endpoints[2].url:'http://127.0.0.1';

              var endpoints = jsonQuery('token[**][name=swift & type=object-store]', {data:objstorbase}).value
              var objstorbaseurl = jsonQuery('endpoints[interface=public & region_id=' + setts.region_id + ']', {data:endpoints}).value.url

              var body = {};
              if (!error && response.statusCode == 201) {
                body = {"userid": setts.username,
                        "token": response.headers['x-subject-token'],
                        "url": objstorbaseurl,
                        "container": setts.container};
                cb(null, body);
              }
              else {
                body = {"token": error, "url": ""};
                cb(null, error);
              };
            };

            // Setting up the Authentication Request to retrieve an X-Auth-Token
            var req_options = {
              url: setts.auth_url,
              headers: {'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache',
                        'Content-Length': Buffer.byteLength(JSON.stringify(data))},
              timeout: 100000,
              method: 'POST',
              body: JSON.stringify(data)
            };
            request(req_options, res_handler);
        });
    };

    /**
     * throw an error because it is not implemented.
     * @method methodName
     * @param {String} param 
     * @param {Function} cb A callback that provides two parameters: An Error, if 
     * occurred and maybe something
     */
    BMObjStorMediaProvider.prototype.createContainer = function(options, cb) {
       var res_handler = function(error, response, body) {
          pb.log.debug("Entering the create container response handlers")
          pb.log.debug(options)
          pb.log.debug(response.statusCode)
          if (!error) {
            cb(null, options)
          }
          else {
            cb(null, error)
          }
       };
       pb.log.debug('Create Container URL: ' + options.url + '/' + options.container)
       var req_options = {
            url: options.url + '/' + options.container,
            headers: {'accept': 'application/json',
                  'X-Auth-Token': options.token,
                  'x-container-read': '.r:*', 
                  'x-cdn-ttl': '1440'},
            timeout: 100000,
            method: 'PUT'
       };

       request(req_options, res_handler);
    };

    /**
     * throw an error because it is not implemented.
     * @method methodName
     * @param {String} param 
     * @param {Function} cb A callback that provides two parameters: An Error, if 
     * occurred and maybe something
     */
    BMObjStorMediaProvider.prototype.createFile = function(mediaPath, fileDataStrOrBuff, options, cb) {
           var self = this
           if (util.isFunction(options)) {
                cb      = options;
                pb.log.debug("Options: " + options)
                options = {};
            }
            else if (!util.isObject(options)) {
                return cb(new Error('The options parameter must be an object'));
            }
           mediaPath = options.url + '/' + options.container + mediaPath;
           pb.log.debug(mediaPath);
           var res_handler = function(error, response, body) {
              pb.log.debug("Entering the response handlers")
              pb.log.debug(response.statusCode)
              pb.log.debug("RESHANDLER: " + mediaPath)
              if (!error) {
                cb(null, mediaPath);
              }
              else {
                cb(error);
              }
           };
        
           pb.log.debug('Full MEDIA URL: ' + mediaPath)
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
     * throw an error because it is not implemented.
     * @method methodName
     * @param {String} param 
     * @param {Function} cb A callback that provides two parameters: An Error, if 
     * occurred and maybe something
     */
    BMObjStorMediaProvider.prototype.createReadableStream = function(mediaPath, cb) {
       pb.log.debug("Step #3 Fired {createReadableStream}");
       var res_handler = function(error, response, body) {
          pb.log.debug("Entering the READABLE STREAM response handlers")
          pb.log.debug(response.statusCode)
          pb.log.debug("EXISTS RESHANDLER: " + mediaPath)
       };
       pb.log.debug('Creating Stream for URL: ' + mediaPath)
       var req_options = {
            url: mediaPath,
            timeout: 100000,
            method: 'GET'
       };
       return request(req_options,res_handler);
    };

    /**
     * throw an error because it is not implemented.
     * @method methodName
     * @param {String} param 
     * @param {Function} cb A callback that provides two parameters: An Error, if 
     * occurred and maybe something
     */
    BMObjStorMediaProvider.prototype.getStream = function(mediaPath, cb) {
        pb.log.debug("Step #3 Fired {getStream}");
        var self = this;
        self.getToken(function(err, body) {
          mediaPath = body.url + '/' + body.container + mediaPath;
          pb.log.debug("Inside getStream: " + mediaPath);
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
     * throw an error because it is not implemented.
     * @method methodName
     * @param {String} param 
     * @param {Function} cb A callback that provides two parameters: An Error, if 
     * occurred and maybe something
     */
    BMObjStorMediaProvider.prototype.get = function(mediaPath, cb) {
        throw new Error('get Not implemented!');
    };

    /**
     * Sets media content into Bluemix Object Storage based on the specified media path and 
     * options.  The stream provided must be a ReadableStream.
     * @method setStream
     * @param {ReadableStream} stream - The content stream
     * @param {String} mediaPath The path/key to the media.  Typically this will be a path
     * such as: /media/2015/10/77f75131-fcc9-456a-b423-f5ea05717a17-1444944578183.png
     * @param {Function} cb A callback that provides two parameters: An Error, if 
     * occurred and maybe something
     */
    BMObjStorMediaProvider.prototype.setStream = function(stream, mediaPath, options, cb) {
        pb.log.debug("Step #1 Fired {setStream}")
        pb.log.debug("MEDIAPATH: " + mediaPath)
        var self = this;

        if (util.isFunction(options)) {
            cb      = options;
            pb.log.debug("Options: " + options)
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
              pb.log.debug("Inside setStream End: " + remoteURL);
              cb(null, remoteURL, true);
            });
        });

        stream.on('error', function(err) {
            cb(err);
        });
    };

    /**
     * throw an error because it is not implemented.
     * @method methodName
     * @param {String} param 
     * @param {Function} cb A callback that provides two parameters: An Error, if 
     * occurred and maybe something
     */
    BMObjStorMediaProvider.prototype.set = function(fileDataStrOrBuff, mediaPath, options, cb) {
        pb.log.debug("Step #2 Fired {set}")
        pb.log.debug('set: mediaPath: ' + mediaPath)
        var self = this;
        self.getToken(function(err, body) {
           self.createContainer(body, function(err, body) {
              self.createFile(mediaPath, fileDataStrOrBuff, body, function(err, mediaPath) {
                if (!err) {
                  pb.log.debug("Success! File Created @: " + mediaPath);
                  cb(null, mediaPath, true);
                } else {
                  pb.log.debug("Error during file creation");
                }
              });
           });
        });
    };

    /**
     * throw an error because it is not implemented.
     * @method methodName
     * @param {String} param 
     * @param {Function} cb A callback that provides two parameters: An Error, if 
     * occurred and maybe something
     */
    BMObjStorMediaProvider.prototype.createWriteStream = function(mediaPath, cb) {
        throw new Error('createWriteStream Not implemented!');
    };

    /**
     * throw an error because it is not implemented.
     * @method methodName
     * @param {String} param 
     * @param {Function} cb A callback that provides two parameters: An Error, if 
     * occurred and maybe something
     */
    BMObjStorMediaProvider.prototype.exists = function(mediaPath, cb) {
           var res_handler = function(error, response, body) {
              pb.log.debug("Entering the EXISTS response handlers")
              pb.log.debug(response.statusCode)
              pb.log.debug("EXISTS RESHANDLER: " + mediaPath)
              if (!error && response.statusCode == 200) {
                cb(null, true);
              }
              else if (!error) {
                cb(null, false);
              } else {
                cb (null, error);
              }
           };
           pb.log.debug('Inspecting URL: ' + mediaPath)
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
     * @param {Function} cb A callback that provides two parameters: An Error, if 
     * occurred and the success of the operation.
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
        // Do some deleting
        self.getToken(function(err, body) {
            pb.log.debug("Delete gettoken: " + JSON.stringify(body));
            mediaPath = body.url + '/' + body.container + mediaPath
            var res_handler = function(error, response, body) {
                pb.log.debug("Entering the DELETE response handlers")
                pb.log.debug(response.statusCode)
                pb.log.debug("DELETE RESHANDLER: " + mediaPath)
                if (!error) {
                  cb(null, true);
                } else {
                  cb (error);
                }
             };
             pb.log.debug('Inspecting URL: ' + mediaPath)
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
     * @method methodName
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
