/*
    Copyright (C) 2016  IBM
    Shamelessly derived and modified from the S3-pencilblue plugin
*/

module.exports = function BMObjStorModule(pb) {

    /**
     * Main Module file for the Bluemix Object Storage Media Provider Plugin
     * @class BMObjStor
     */
    function BMObjStor(){}

    /**
     * Called when the application is being installed for the first time.
     *
     * @param cb A callback that must be called upon completion.  cb(Error, Boolean).
     * The result should be TRUE on success and FALSE on failure
     */
    BMObjStor.onInstall = function(cb) {
        var objStorCreds = {}
        if (process.env.VCAP_SERVICES) {
          try {
              var services = JSON.parse(process.env.VCAP_SERVICES);
              var pluginService = new pb.PluginService();
              pb.log.silly("PencilBlue: Bluemix: Detecting object storage instance ...")
              for (var svcName in services) {
                  if (svcName.match(/^Object-Storage/)) {
                      objStorCreds = services[svcName][0]['credentials'];
                      var calculatedSettings = [{"name":"container","value":"pencilblue_images"},
                                                {"name":"auth_url","value":objStorCreds.auth_url + "/v3/auth/tokens"},
                                                {"name":"password","value":objStorCreds.password},
                                                {"name":"projectId","value":objStorCreds.projectId},
                                                {"name":"userId","value":objStorCreds.userId}];
                      pluginService.setSettings(calculatedSettings, "bluemix-objstor-pencilblue", function(err, pluginSettings) {
                        if (pb.util.isError(err)) {
                            return cb(err, '');
                        }
                        cb(null, true);
                      });
                  } 
              }
              if (!Object.keys(objStorCreds).length) {
                pb.log.silly("PencilBlue: Bluemix: No bound OpenStack Swift Object Storage detected");
              }
          } catch (e) {
              pb.log.silly(e);
          }
        }
        cb(null, true);
    };

    /**
     * Called when the application is uninstalling this plugin.  The plugin should
     * make every effort to clean up any plugin-specific DB items or any in function
     * overrides it makes.
     *
     * @param cb A callback that must be called upon completion.  cb(Error, Boolean).
     * The result should be TRUE on success and FALSE on failure
     */
    BMObjStor.onUninstall = function(cb) {
        cb(null, true);
    };

    /**
     * Called when the application is starting up. The function is also called at
     * the end of a successful install. It is guaranteed that all core PB services
     * will be available including access to the core DB.
     *
     * @param cb A callback that must be called upon completion.  cb(Error, Boolean).
     * The result should be TRUE on success and FALSE on failure
     */
    BMObjStor.onStartup = function(cb) {
        cb(null, true);
    };

    /**
     * Called when the application is gracefully shutting down.  No guarantees are
     * provided for how much time will be provided the plugin to shut down.
     *
     * @param cb A callback that must be called upon completion.  cb(Error, Boolean).
     * The result should be TRUE on success and FALSE on failure
     */
    BMObjStor.onShutdown = function(cb) {
        cb(null, true);
    };

    //exports
    return BMObjStor;
};
