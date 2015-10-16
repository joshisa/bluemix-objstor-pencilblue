/*
    Copyright (C) 2015 IBM
    Shamelessly copied and modified from the S3-pencilblue plugin
*/

module.exports = function BMObjStorMediaProviderModule(pb) {
    
    //pb dependencies
    var util          = pb.util;
    var PluginService = pb.PluginService;
    var request       = PluginService.require('bluemix-objstor-pencilblue', 'request');
    /**
     * Media provider to upload files to IBM Bluemix Object Storage v1
     * @class BMObjStorMediaProvider
     * @constructor
     * @implements MediaProvider
     */
    function BMObjStorMediaProvider() {
        /**
         *
         * @property pluginService
         * @type {PluginService}
         */
        this.pluginService = new PluginService();
    };

    /**
     * Retrieves 
     * @method getClient
     * @param {Function} cb A callback that provides parameters: The first an 
     * error, if occurred.  The second is a Bluemix Obj Stor instance for interfacing with 
     * Bluemix Object Storage.  The last parameter is the hash of the plugin settings.  
     * {"auth_uri":"", "username":"", "password":"", "container":"", "cluster":"dal05"}
     */
    BMObjStorMediaProvider.prototype.getToken = function(cb) {
        this.pluginService.getSettingsKV('bluemix-objstor-pencilblue', function(err, setts) {
            if (util.isError(err)) {
                return cb(err);
            }
            var authHeader = BMObjStorMediaProvider.authHeaderCalculated(setts.username, setts.password)
            var res_handler = function(error, response, res_body) {
              var body = {};
              if (!error && response.statusCode == 200) {
                body = {"userid": setts.username,
                        "token": response.headers['x-auth-token'],
                        "url": response.headers['x-storage-url'],
                        "container": setts.container};
                cb(null, body);
              }
              else {
                body = {"token": error, "url": ""};
                cb(null, error);
              };
            };
            var req_options = {
              url: setts.auth_uri + '/' + setts.username,
              headers: {'accept': 'application/json',
                        'Authorization': authHeader},
              timeout: 100000,
              method: 'GET'
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
          console.log("Entering the create container response handlers")
          console.log(options)
          console.log(response.statusCode)
          if (!error) {
            cb(null, options)
          }
          else {
            cb(null, error)
          }
       };
       console.log('Create Container URL: ' + options.url + '/' + options.container)
       var req_options = {
            url: options.url + '/' + options.container,
            headers: {'accept': 'application/json',
                  'X-Auth-Token': options.token,
                  'x-container-read': '.r:*', 'x-cdn-ttl': '1440'},
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
                console.log("Options: " + options)
                options = {};
            }
            else if (!util.isObject(options)) {
                return cb(new Error('The options parameter must be an object'));
            }
           console.log("set: Body: " + JSON.stringify(options))
           mediaPath = options.url + '/' + options.container + mediaPath;
           console.log(mediaPath);
           var res_handler = function(error, response, body) {
              console.log("Entering the response handlers")
              console.log(response.statusCode)
              console.log("RESHANDLER: " + mediaPath)
              if (!error) {
                cb(null, mediaPath);
              }
              else {
                cb(error);
              }
           };
           console.log('Full MEDIA URL: ' + mediaPath)
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
       console.log("Step #3 Fired {createReadableStream}");
       var res_handler = function(error, response, body) {
          console.log("Entering the READABLE STREAM response handlers")
          console.log(response.statusCode)
          console.log("EXISTS RESHANDLER: " + mediaPath)
       };
       console.log('Creating Stream for URL: ' + mediaPath)
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
        console.log("Step #3 Fired {getStream}");
        var self = this;
        self.getToken(function(err, body) {
          mediaPath = body.url + '/' + body.container + mediaPath;
          console.log("Inside getStream: " + mediaPath);
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
        console.log("Step #1 Fired {setStream}")
        console.log("MEDIAPATH: " + mediaPath)
        var self = this;

        if (util.isFunction(options)) {
            cb      = options;
            console.log("Options: " + options)
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
              console.log("Inside setStream End: " + remoteURL);
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
        console.log("Step #2 Fired {set}")
        console.log('set: mediaPath: ' + mediaPath)
        var self = this;
        self.getToken(function(err, body) {
           self.createContainer(body, function(err, body) {
              self.createFile(mediaPath, fileDataStrOrBuff, body, function(err, mediaPath) {
                if (!err) {
                  console.log("Success! File Created @: " + mediaPath);
                  cb(null, mediaPath, true);
                } else {
                  console.log("Error during file creation");
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
              console.log("Entering the EXISTS response handlers")
              console.log(response.statusCode)
              console.log("EXISTS RESHANDLER: " + mediaPath)
              if (!error && response.statusCode == 200) {
                cb(null, true);
              }
              else if (!error) {
                cb(null, false);
              } else {
                cb (null, error);
              }
           };
           console.log('Inspecting URL: ' + mediaPath)
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
            console.log("Delete gettoken: " + body);
            var res_handler = function(error, response, body) {
                console.log("Entering the DELETE response handlers")
                console.log(response.statusCode)
                console.log("DELETE RESHANDLER: " + mediaPath)
                if (!error) {
                  cb(null, true);
                } else {
                  cb (error);
                }
             };
             console.log('Inspecting URL: ' + mediaPath)
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
        pb.log.silly('BMObjStorMediaProvider: stat method fired');
        throw new Error('stat Not implemented!');
    };

    /**
     * In order to fetch the Storage URL, a basic auth header needs to be given.
     * This function calculates that header.
     * @static
     * @method authHeaderCalculated
     * @param {String} userid
     * @param {String} password
     * @return {String} A Calculated Basic Auth Header
     */
    BMObjStorMediaProvider.authHeaderCalculated = function(userid, password) {
        pb.log.silly('BMObjStorMediaProvider: authHeaderCalculated method fired');
        authheader = "Basic " + Buffer(userid + ":" + password).toString("base64");
        pb.log.silly('BMObjStorMediaProvider: calculated authHeader: %s', authheader);
        return authheader;
    };

    //exports
    return BMObjStorMediaProvider;
};
