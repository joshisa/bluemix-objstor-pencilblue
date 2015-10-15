/*
    Copyright (C) 2015 IBM
    Shamelessly copied and modified from the S3-pencilblue plugin
*/

module.exports = function BMObjStorMediaProviderModule(pb) {
    
    //pb dependencies
    var util          = pb.util;
    var PluginService = pb.PluginService;
    var Bluemix       = PluginService.require('bluemix-objstor-pencilblue', 'request');

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
            pb.log.silly('BMObjStorMediaProvider: GetToken Provided Hash Settings: %s', setts);
            if (util.isError(err)) {
                return cb(err);
            }
            var res_handler = function(error, response, res_body) {
              var body = {};
              if (!error && response.statusCode == 200) {
                body = {"userid": req.params.userid,
                        "token": response.headers['x-auth-token'],
                        "url": response.headers['x-storage-url']};
                cache[req.params.userid] = body;
                cb(null, body);
              }
              else {
                body = {"token": error, "url": ""};
                cb(null, error);
              };
            };
            var authHeader = BMObjStorMediaProvider.authHeaderCalculated(setts.username, setts.password)
            var req_options = {
              url: auth.auth_uri + '/' + req.params.userid,
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
    BMObjStorMediaProvider.prototype.getStream = function(mediaPath, cb) {
        pb.log.silly('BMObjStorMediaProvider: getStream method fired');
        throw new Error('getStream Not implemented!');
    };

    /**
     * throw an error because it is not implemented.
     * @method methodName
     * @param {String} param 
     * @param {Function} cb A callback that provides two parameters: An Error, if 
     * occurred and maybe something
     */
    BMObjStorMediaProvider.prototype.get = function(mediaPath, cb) {
        pb.log.silly('BMObjStorMediaProvider: get method fired');
        throw new Error('get Not implemented!');
    };

    /**
     * throw an error because it is not implemented.
     * @method methodName
     * @param {String} param 
     * @param {Function} cb A callback that provides two parameters: An Error, if 
     * occurred and maybe something
     */
    BMObjStorMediaProvider.prototype.setStream = function(stream, mediaPath, cb) {
        pb.log.silly('BMObjStorMediaProvider: setStream method fired');
        throw new Error('setStream Not implemented!');
    };

    /**
     * throw an error because it is not implemented.
     * @method methodName
     * @param {String} param 
     * @param {Function} cb A callback that provides two parameters: An Error, if 
     * occurred and maybe something
     */
    BMObjStorMediaProvider.prototype.set = function(fileDataStrOrBuff, mediaPath, cb) {
        pb.log.silly('BMObjStorMediaProvider: set method fired');
        throw new Error('set Not implemented!');
    };

    /**
     * throw an error because it is not implemented.
     * @method methodName
     * @param {String} param 
     * @param {Function} cb A callback that provides two parameters: An Error, if 
     * occurred and maybe something
     */
    BMObjStorMediaProvider.prototype.createWriteStream = function(mediaPath, cb) {
        pb.log.silly('BMObjStorMediaProvider: createWriteStream method fired');
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
        pb.log.silly('BMObjStorMediaProvider: exists method fired');
        throw new Error('exists Not implemented!');
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
        pb.log.silly('BMObjStorMediaProvider: delete method fired');
        if (util.isFunction(options)) {
            cb      = options;
            options = {};
        }
        else if (!util.isObject(options)) {
            return cb(new Error('The options parameter must be an object'));
        }
        // Do some deleting
        throw new Error('delete Not implemented!');
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
