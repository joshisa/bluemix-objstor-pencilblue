Bluemix Object Storage (Openstack Swift)<br/>PencilBlue Media Provider
==

####A plugin that allows for the Bluemix Object Storage service to be the media storage for the platform.

Installation:

1) Clone repo into your PencilBlue's **plugins** directory.

2) Edit your **config.json** file to configure the media provider
```
{
  "media": {
    "provider": "/plugins/bluemix-objstor-pencilblue/include/bluemix_objstor_media_provider.js"
  }
}
```

3) Create and Bind a Bluemix Object Storage instance to your PB instance

4) Start or restart your PB instance.

5) Navigate to **Manage Plugins** section in PencilBlue

6) Install the **bluemix-objstor-pencilblue** plugin

7) Upon successful install click the **Settings** button for the bluemix-objstor-pencilblue plugin.  Validate that the settings have been pre-populated based on Object Storage bound to the PB Instance.  Modify as necessary.

8) Click **Save**

You should be good to go!

**NOTE:**
Currently there is no way to migrate data from one media provider to the other.  If "uploaded" media already exists 
that was created from a different provider then you must delete it and upload it.  You will also have to re-link any 
system objects that rely on that media until you can replace the content for a media object.  See 
[https://github.com/pencilblue/pencilblue/issues/218](https://github.com/pencilblue/pencilblue/issues/218)

##LICENSE:  Apache-2.0
