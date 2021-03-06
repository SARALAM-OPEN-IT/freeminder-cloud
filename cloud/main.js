// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:

CONFIG = require('cloud/config/config');
var _ = require('underscore.js')


Parse.Cloud.define("hello", function(request, response) {
  response.success("Hello world!");
});


Parse.Cloud.define("appSignup", function (req, res) {

    var email = req.params.email;
    var password = req.params.password;
    var mobile = req.params.mobile;
    var service = req.params.service;
    var username = req.params.email;
    var bname = req.params.username;


    checkMobileUnique(mobile, function (err, status) {
        if (err) {
            res.error({message: err, status: 'failure'});
        } else {
            if (status == "success") {
                res.error({message: 'Mobile number already exists', status: 'failure'});
            } else {
                var user = new Parse.User();
                user.set("username", username);
                user.set("bname", bname);
                user.set("password", password);
                user.set("email", email);
                user.set("mobile", mobile);
                user.set("service", service);
                user.set("isMobileVerified", false);

                console.log('creating subscription data');
                var today = new Date();

                var afterOneMonth = new Date();
                afterOneMonth.setMonth(today.getMonth() + 1);

                    var freePlan = [{'startDate':today.getTime(), 'endDate':afterOneMonth.getTime(), 'bdom': today.getDate(), 'type': 'prepaid', 'frequency':'monthly', 'credits':{'sms':100, 'email':10000},'charges':{'oneoff':0, 'recurring':0}}];
                user.set('subs', freePlan);

                //add usage record for the period

                var today = new Date();
                var afterOneMonth = new Date();
                afterOneMonth.setMonth(today.getMonth() + 1);

                var usageRecs = [];
                var usageRec = {};

                usageRec.startDate = (new Date()).getTime();
                usageRec.endDate = afterOneMonth.getTime();
                usageRec.usage = {};
                usageRec.usage.sms = 0;
                usageRec.usage.email = 0;
                usageRecs.push(usageRec);
                user.set('usage', usageRecs);

                console.log('Init new usage record for period ' + usageRec.startDate + ' to ' + usageRec.endDate);


                user.signUp(null, {
                    success: function (user) {
                     res.success({message: '', status: 'success', id:user.id, user:user});
                    },
                    error: function (user, error) {
                        res.error({message: error.message, status: 'failure'});
                    }
                });

            }
        }
    });
});


Parse.Cloud.define("appLoginO", function (req, res) {
  var username = req.params.username;
  var password = req.params.password;

  Parse.User.logIn(username, password, {
    success: function(user) {
      // Do stuff after successful login.
      res.success({message: '', status: 'success', id: user.id, user:user.toJSON()});
    },
    error: function(user, error) {
      // The login failed. Check error to see why.
      res.error({message: error.message, status: 'failure'});
    }
  });

});


Parse.Cloud.define("appLogin", function (request, response) {
    var username = request.params.username;
    var password = request.params.password;
    var status;
    //check if username mobile/email
    if (username.indexOf("@") > -1) {
        status = "email";
    } else {
        status = "mobile";
    }
    getUserVerifiedDetails(username, status, function (err, userLoginResult) {
        if (err) {
            console.log(err);
            response.error({code: 0, error: err, message: "Please try again"});
        } else {
            if (userLoginResult.results) {
                var newUserResult = userLoginResult.results;
                var userResult = newUserResult.toJSON();
                Parse.User.logIn(userResult.username, password, {
                    success: function (user) {
                        //userResult.sessionToken = Parse.User.current()._sessionToken;
                        //response.success({code: 1, user: userResult, id: Parse.User.current().id});
                        response.success({message: '', status: 'success', id: user.id, user:user.toJSON()});
                    },
                    error: function (user, error) {
                        response.error({code: 0, error: error, message: "Password not correct"});
                    }
                });
            } else {
                response.error({message: userLoginResult.message, code: 0, error: 'Login Failed'});
            }
        }
    });
});


Parse.Cloud.define("updateUser", function (req, res) {
    Parse.Cloud.useMasterKey();

    var email = req.params.email;
    var password = req.params.password;
    var mobile = req.params.mobile;
    var service = req.params.service;
    var bname = req.params.username;
    var userId = req.params.userId;

    var query = new Parse.Query("User");



    query.get(userId, {
        success: function(user) {

            var proceed = true;
            checkMobileUnique(mobile, function (err, status) {

                if (err) {
                    res.error({message: err, status: 'failure'});
                } else {
                    if (status == "success") {
                        //console.log("user mobile :" + user.toJSON().mobile);
                        if(user.toJSON().mobile != mobile) {
                            res.error({message: 'Mobile number already exists', status: 'failure'});
                            proceed = false;
                        }
                    }

                    if(proceed) {
                        user.set("bname", bname);
                        user.set("password", password);
                        user.set("email", email);
                        user.set("mobile", mobile);
                        user.set("service", service);

                        user.save(null, {
                            success: function (user) {
                             res.success({message: 'User details successfully updated', status: 'success', id:user.id, user:user});
                            },
                            error: function (user, error) {
                                res.error({message: error.message, status: 'failure'});
                            }
                        });
                    }

                }
            });

          // The object was deleted from the Parse Cloud.
      },
      error: function(customer, error) {
        // The delete failed.
        // error is a Parse.Error with an error code and message.
        res.error({message: error.message, status: 'failure'});
      }
    });




});




Parse.Cloud.define("getActions", function (request, response) {
    Parse.Cloud.useMasterKey();

    var messageQuery = new Parse.Query('CustomerAction');
    messageQuery.equalTo('parentId', request.params.parentId);
    var actionsList = [];
    messageQuery.find({
        success: function (actions) {

            for(var i=0; i < actions.length; ++i) {

                actionsList.push(actions[i]);
            }
            console.log('Found ' + i + ' action obeject(s)');
            response.success({actions: actionsList});

        },
        error: function (err) {
            console.log(err);
            response.error(err);
        }
    });
});






Parse.Cloud.define("saveContact", function (request, response) {
    Parse.Cloud.useMasterKey();

    var objectId = request.params.objectId || '';
    var parentId = request.params.parentId;
    var email = request.params.email;
    var mobile = request.params.mobile;
    var username = request.params.username;
    var service = request.params.service;

    checkMobileUniqueInContact(mobile, function (err, status) {
        if (err) {
            response.error({message: err, status: 'failure'});
        } else {
            if (status == "success" && !objectId.length) {
                response.error({message: 'Mobile number already exists', status: 'failure'});
            } else {



                var Contact = Parse.Object.extend('CustomerDetails');
                var contact = new Contact();
                if(objectId.length) {
                    contact.id = objectId;
                }
                contact.set('parentId', parentId);
                contact.set('email', email);
                contact.set('mobile', mobile);
                contact.set('name', username);
                contact.set('service', service);


                contact.save(null, {
                  success: function(contact) {
                    // Execute any logic that should take place after the object is saved.
                    alert('New object created with objectId: ' + contact.id);
                    response.success({message: 'object created/update with objectId', status: 'success', id:contact.id, customer:contact});
                  },
                  error: function(action, error) {
                    // Execute any logic that should take place if the save fails.
                    // error is a Parse.Error with an error code and message.
                    alert('Failed to create/update  object, with error code: ' + error.message);
                    response.error({message: error.message, status: 'falure'});
                  }
                });
            }
        }
    });

});

Parse.Cloud.define("saveAction", function (request, response) {
    Parse.Cloud.useMasterKey();

    var objectId = request.params.objectId || '';
    var parentId = request.params.parentId;
    var actionname = request.params.name;
    var email = request.params.email;
    var sms = request.params.sms;
    var voice = request.params.voice;
    var content = request.params.action_text;
    var actionsince = request.params.start;
    var actionuntil = request.params.end;
    var actionfrequency = request.params.frequency;
    var runonsave = request.params.runonsave;
    var service = request.params.service;
    var dom = request.params.dom;

    var Action = Parse.Object.extend('CustomerAction');
    var action = new Action();

    if(objectId.length) {
        action.id = objectId;
    }



    action.set('parentId', parentId);
    action.set('actionname', actionname);
    action.set('email', email);
    action.set('sms', sms);
    action.set('voice', voice);
    action.set('content', content);
    action.set('actionsince', actionsince);
    action.set('actionuntil', actionuntil);
    action.set('actionfrequency', actionfrequency);
    action.set('runonsave', runonsave);
    action.set('service', service);
    action.set('dom', dom);




    action.save(null, {
      success: function(action) {
        // Execute any logic that should take place after the object is saved.
        alert('New object created with objectId: ' + action.id);
        response.success({message: 'New object created with objectId', status: 'success', id:action.id, action:action});
      },
      error: function(action, error) {
        // Execute any logic that should take place if the save fails.
        // error is a Parse.Error with an error code and message.
        alert('Failed to create new object, with error code: ' + error.message);
        response.error({message: error.message, status: 'falure'});
      }
    });

});


Parse.Cloud.define("sendSMS", function (request, response) {
    Parse.Cloud.useMasterKey();

    var mobile = request.params.mobile;
    var messageText = request.params.text;
    var senderName = request.params.sender;

    sendSMS(mobile, messageText, senderName);

    response.success({message: "message sent",  status: 'success'});



});

Parse.Cloud.define("sendEmail", function (request, response) {
    Parse.Cloud.useMasterKey();

    var toEmail = request.params.toEmail;
    var toName = request.params.toName;
    var messageText = request.params.messageText;
    var fromInfo = request.params.fromInfo;
    sendEmail(toEmail, toName, messageText, fromInfo);
    response.success({message: "message sent successfully",  status: 'success'});
});



Parse.Cloud.define("getCustomers", function (request, response) {
    Parse.Cloud.useMasterKey();

    var messageQuery = new Parse.Query('CustomerDetails');
    messageQuery.equalTo('parentId', request.params.parentId);
    var customerList = [];
    messageQuery.find({
        success: function (customers) {

            for(var i=0; i < customers.length; ++i) {

                customerList.push(customers[i]);
            }
            console.log('Found ' + i + ' customer obeject(s)');
            response.success({customers: customerList});

        },
        error: function (err) {
            console.log(err);
            response.error(err);
        }
    });
});

Parse.Cloud.define("deleteCustomer", function (request, res) {
    Parse.Cloud.useMasterKey();
    var customerId = request.params.customerId;

    var query = new Parse.Query("CustomerDetails");


    query.get(customerId, {
        success: function(customer) {
            customer.destroy({
              success: function(customer) {
                // The object was deleted from the Parse Cloud.
                res.success({message: 'The object was deleted from the Parse Cloud', status: 'success'});
              },
              error: function(customer, error) {
                // The delete failed.
                // error is a Parse.Error with an error code and message.
                res.error({message: error.message, status: 'failure'});
              }
            });
        // The object was deleted from the Parse Cloud.
      },
      error: function(customer, error) {
        // The delete failed.
        // error is a Parse.Error with an error code and message.
        res.error({message: error.message, status: 'failure'});
      }
    });
});


Parse.Cloud.define("removeAction", function (request, res) {
    Parse.Cloud.useMasterKey();
    var objectId = request.params.objectId;

    var query = new Parse.Query("CustomerAction");


    query.get(objectId, {
        success: function(customer) {
            customer.destroy({
              success: function(customer) {
                // The object was deleted from the Parse Cloud.
                res.success({message: 'The object was deleted from the Parse Cloud', status: 'success'});
              },
              error: function(customer, error) {
                // The delete failed.
                // error is a Parse.Error with an error code and message.
                res.error({message: error.message, status: 'failure'});
              }
            });
        // The object was deleted from the Parse Cloud.
      },
      error: function(customer, error) {
        // The delete failed.
        // error is a Parse.Error with an error code and message.
        res.error({message: error.message, status: 'failure'});
      }
    });
});

Parse.Cloud.afterSave(Parse.User, function(request) {

    var user = request.user;
    if(request.object.existed() ){

        console.log("user " + user.id + " has been updated  ");

        return false;
    }

    if(user){

    }

});

Parse.Cloud.define("sendAll", function (request, res) {
    Parse.Cloud.useMasterKey();

    //{"contacts":{"obj1":3, "obj2":2...}}
    var emailFromInfo = {};
    var contacts = request.params.contacts;
    var content = request.params.content;
    var appUser = request.params.username;

    var sms = 0;
    var email = 0;

    emailFromInfo.username = request.params.username;
    console.log(contacts);
    var contactIds = [];
    var customerList = [];

    for (var key in contacts)
    {
        contactIds.push(key);


    }

     pullCustomers(contactIds, function(objects, result) {

            if(result == "success") {
                for(var i = 0; i<objects.length; i++) {
                    console.log(objects[i].toJSON());

                    var objectId = objects[i].toJSON().objectId;
                    var option = contacts[objectId];
                    var payload = {};
                    payload.option = option;
                    payload.customer = objects[i].toJSON();
                    customerList.push(payload);


                }


            } else {
               res.error({message: 'Unable to sendAll', status: 'failure'});
            }
     });


    doSendAll(appUser, function(user, result) {

        if(result == "failure") {
            res.error({message: 'Unable to sendAll', status: 'failure'});
        }

        usage = user.get('usage');
        subs = user.get('subs');
        bdom = subs.bdom;
        credits = subs[0].credits;
        console.log('found user ..' + user.toJSON())
        emailFromInfo.username = user.toJSON().bname;
        var SMSsenderName = user.toJSON().bname;

        if(!usage) {
          console.log('creating usage record for the period');
          var today = new Date();
          today.setDate(bdom);

          var afterOneMonth = new Date();
          afterOneMonth.setDate(bdom);
          afterOneMonth.setMonth(today.getMonth() + 1);
          console.log('Usage Dates ' + today + ' ' + afterOneMonth);

          var usageRecs = [];
          var usageRec = {};

          usageRec.startDate = today.getTime();
          usageRec.endDate = afterOneMonth.getTime();
          usageRec.usage = {};
          usageRec.usage.sms = 0;
          usageRec.usage.email = 0;

          usageRecs.push(usageRec);
          appUser.set('usage', usageRecs);
          appUser.save();
          currentUsageRec = usageRecs[0];
          usage = usageRecs;

        } else {

          currentUsageIdx = getCurrentUsageRecord(usage);
          if(currentUsageIdx >= 0) {
              currentUsageRec = usage[currentUsageIdx];
              console.log('found current usage record ' + currentUsageRec + ' at ' + currentUsageIdx );
          } else {

              var today = new Date();
              today.setDate(bdom);
              var afterOneMonth = new Date();
              afterOneMonth.setDate(bdom);
              afterOneMonth.setMonth(today.getMonth() + 1);
              console.log('Usage Dates ' + today + ' ' + afterOneMonth);
              var usageRecs = [];
              var usageRec = {};

              usageRec.startDate = today.getTime();
              usageRec.endDate = afterOneMonth.getTime();
              usageRec.usage = {};
              usageRec.usage.sms = 0;
              usageRec.usage.email = 0;
              usage.push(usageRec);
              appUser.set('usage', usage);
              appUser.save();
              currentUsageRec = usage[usage.length - 1];

              console.log('Init new usage record for period ' + usageRec.startDate + ' to ' + usageRec.endDate);


      }
    }

        customerList.forEach(function(payload){

            console.log("send for " + payload.customer + '' + payload.option );

            var option = payload.option;
            var customer = payload.customer;


            switch(option) {
                case 1:
                  sendEmail(customer.email, customer.name, content, emailFromInfo);

                  email++;
                  break;
                case 2:
                  if(currentUsageRec.usage.sms < credits.sms){
                    //sendSMS(customer.mobile, content, SMSsenderName);
                    sms++;
                  }


                  break;
                case 3:
                    sendEmail(customer.email, customer.name, content, emailFromInfo);
                    if(currentUsageRec.usage.sms < credits.sms){
                      //sendSMS(customer.mobile, content, SMSsenderName);
                      sms++;
                    }
                    email++;

                    break;

                default:
            }
        });

        currentUsageRec.usage.sms = currentUsageRec.usage.sms + sms;
        currentUsageRec.usage.email = currentUsageRec.usage.email + email;
        usage[currentUsageIdx] = currentUsageRec;
        user.save('usage', usage);
        res.success({message: 'Sent to sendAll', status: 'success'});


    });


});



//functions

function getUserVerifiedDetails (username, status, callBack) {
    Parse.Cloud.useMasterKey();
    var resCallback = {};
    var query = new Parse.Query("User");
    query.equalTo(status, username);
    query.first({
        success: function (userResults) {
            if (userResults) {

                var queryEmailVerified = new Parse.Query("User");
                queryEmailVerified.equalTo("emailVerified", true);
                queryEmailVerified.equalTo(status, username);

                var queryMobileVerified = new Parse.Query("User");
                queryMobileVerified.equalTo("isMobileVerified", true);
                queryMobileVerified.equalTo(status, username);

                var queryEmailOrMob = new Parse.Query.or(queryEmailVerified,queryMobileVerified);
                queryEmailOrMob.first({
                    success: function (userResults) {
                        if (userResults) {
                            resCallback.status = "success";
                            resCallback.message = "";
                            resCallback.results = userResults;
                            callBack(null, resCallback);
                        } else {
                            resCallback.status = "failure";
                            resCallback.message = "Please verify "+status.substr(0, 1).toUpperCase() + status.substr(1);
                            resCallback.results ='';
                            callBack(null, resCallback);
                        }
                    },
                    error: function (error) {
                        console.log(error.message);
                        callBack(new Error(error.message));
                    }
                });
            } else {
                resCallback.status = "failure";
                resCallback.results ='';
                if(status == "email"){
                    resCallback.message = "Invalid Email Address. Please enter a valid email address.";
                }else{
                    resCallback.message = "Invalid Mobile Number. Please enter a valid mobile number.";
                }
                callBack(null, resCallback);
            }
        },
        error: function (error) {
            console.log(error.message);
            callBack(new Error(error.message));
        }
    });

};

function checkMobileUnique(mobile, callBack) {
    Parse.Cloud.useMasterKey();
    var query = new Parse.Query("User");
    query.equalTo("mobile", mobile);
    query.first({
        success: function (results) {
            if (results) {
                callBack(null, "success");
            } else {
                callBack(null, "failure");
            }
        },
        error: function (error) {
            console.log(error.message);
            callBack(new Error(error.message));
        }
    });
};


function checkMobileUniqueInContact(mobile, callBack) {
    Parse.Cloud.useMasterKey();
    var query = new Parse.Query("CustomerDetails");
    query.equalTo("mobile", mobile);
    query.first({
        success: function (results) {
            if (results) {
                callBack(null, "success");
            } else {
                callBack(null, "failure");
            }
        },
        error: function (error) {
            console.log(error.message);
            callBack(new Error(error.message));
        }
    });
};

function pullCustomers(contactIds, callBack) {

    Parse.Cloud.useMasterKey();

    var query = new Parse.Query("CustomerDetails");
    query.containedIn("objectId", contactIds);
    query.find({
        success: function (results) {
            if (results) {
                callBack(results, "success");
            } else {
                callBack(null, "failure");
            }
        },
        error: function (error) {
            console.log(error.message);
            callBack(new Error(error.message));
        }
    });


}


function sendSMS(phone, messageText, senderName) {



    var mobile = phone.replace(/\D/g,'');

    if(mobile.length > 10) {
        mobile = mobile.slice(mobile.length - 10, mobile.length);
    }
    mobile = "+91"+mobile;

    if(!senderName) {
     senderName = 'Sent from freeminder.in';
    }



    var requrl = 'http://api.clickatell.com/http/sendmsg?api_id=' +
             CONFIG.CONFIG_MODULE.clickatell.api_id + '&user=' +
             CONFIG.CONFIG_MODULE.clickatell.user + '&password=' +
             CONFIG.CONFIG_MODULE.clickatell.password + '&to=' + mobile +
             '&from='+ CONFIG.CONFIG_MODULE.clickatell.from +
             '&text='+messageText + '-' + senderName;

    console.log('sending SMS from cloud' + encodeURI(requrl));


    Parse.Cloud.httpRequest({
      url: encodeURI(requrl)
    }).then(function(httpResponse) {
      // success
      console.log(httpResponse.text);
      console.log('SMS Sent successfully');


    },function(httpResponse) {
      // error
      console.log('Request failed with response code ' + httpResponse.status);

    });

    //document.write("Headers are:"+headers);


}

function sendEmail (toEmail, toName, messageText, fromInfo) {

    var Mandrill = require('mandrill');

    Mandrill.initialize(CONFIG.CONFIG_MODULE.mandrill.api_key);

    console.log('sending email from cloud');

    Mandrill.sendEmail({
        message: {
            text: messageText,
            subject: "Notification from " + fromInfo.username,
            from_email: CONFIG.CONFIG_MODULE.email.fromEmail,
            from_name: fromInfo.username,
            to: [
                {
                    email: toEmail,
                    name: toName
                }
            ]
        },
        async: true
        },{
        success: function(httpResponse) {
            console.log(httpResponse);
            //response.success("Email sent!");

        },
        error: function(httpResponse) {
            console.error(httpResponse);
            //response.error("Uh oh, something went wrong");

        }
    });


}


function getCurrentUsageRecord(usageRecords) {

    for(i = 0; i < usageRecords.length; i++) {

        var rec = usageRecords[i];
        var today = (new Date()).getTime();
        console.log('looping the usages array :' + today);
        var startDate = rec.startDate;
        var endDate = rec.endDate;
        if((today >= startDate) && (today <= endDate)) {
            return i;
        }

    }
    return -1;

}

function calcNextRunDate (action) {

  var today = new Date();
  var nextRunDateStr = action.nextrun;
  var nextRunDate;
  var frequency = action.actionfrequency;
  if(!nextRunDateStr) {
    nextRunDate = new Date();

  } else {
    var parts = nextRunDateStr.split('/');

    nextRunDate = new Date(parts[2],parts[1]-1,parts[0]);

  }

   switch (frequency) {
    case "monthly":
      nextRunDate.setMonth(today.getMonth() + 1);
      break;
    case "bi-monthly":
      nextRunDate.setMonth(today.getMonth() + 2);
      break;
    case "weekly":
      nextRunDate.setDate(today.getMonth() + 1);
      break;
    case "bi-weekly":
      nextRunDate.setDate(today.getDate() + 14);
      break;
    case "daily":
        nextRunDate.setDate(today.getDate() + 7);
      break;
    case "yearly":
      nextRunDate.setFullYear(today.getFullYear() + 1);
      break;
    case "semi-annual":
      nextRunDate.setMonth(today.getMonth() + 6);
      break;
    case "quarterly":
      nextRunDate.setMonth(today.getMonth() + 3);
      break;
    case "onetime":
      nextRunDate.setDate(today.getDate());
      break;

    default:

  }

  var nextRunDateStr = nextRunDate.getDate() + '/' + (nextRunDate.getMonth() + 1) + '/' + nextRunDate.getFullYear();
  console.log("Next Run caculated as " + nextRunDate + '' + nextRunDateStr)
  return nextRunDateStr;


}


function processAction(action, currentUsageRec, credits, usage, currentUsageIdx, user, contactList) {



       console.log('processing Action');


       var activeSinceStr = action.toJSON().actionsince;
       var activeUntilStr = action.toJSON().actionuntil;
       var actionNextRunStr = action.toJSON().nextrun;

       if((action.toJSON().dom != new Date().getDate()) && (action.toJSON().dom != '0')) {
           return;
       }

       var parts = activeSinceStr.split('/');
       //please put attention to the month (parts[0]), Javascript counts months from 0:
       // January - 0, February - 1, etc
       var activeSinceDate = new Date(parts[2],parts[1]-1,parts[0]);
       console.log ("active Since " + activeSinceDate);
       if(activeSinceDate.getTime() > new Date().getTime()) {
           return;

       }

       if(actionNextRunStr) {
                parts = actionNextRunStr.split('/');

                var actionNextRunDate = new Date(parts[2],parts[1]-1,parts[0]);

                if((actionNextRunDate.getDate() != new Date().getDate()) ||                                                                                           (actionNextRunDate.getMonth() != new Date().getMonth()) ||
                    (actionNextRunDate.getFullYear() != new Date().getFullYear())) {

                    return;

              }
        }

                                           //carry on

        if(action.toJSON().sms) {
            //check credits before sending SMS
            if(currentUsageRec.usage.sms >= credits.sms) {
                //create push notification to app user
                console.log('Running out of Free Credits ...Upgrade');

            } else {

                //send sms
                contactList.forEach(function(contact) {

                    console.log("sending sms ..");

                    sendSMS(contact.mobile, action.toJSON().content, user.toJSON().bname);

                    currentUsageRec.usage.sms = currentUsageRec.usage.sms + 1;
                });

            }
        }


        emailFromInfo = {};
        emailFromInfo.username = user.toJSON().bname;
        emailFromInfo.email = user.toJSON().email;

        contactList.forEach(function(contact) {
            var contact = contactList[i];
            sendEmail(contact.email, contact.name, action.toJSON().content, emailFromInfo);
            currentUsageRec.usage.email = currentUsageRec.usage.email + 1;
        });


        usage[currentUsageIdx] = currentUsageRec;
        user.save('usage', usage);




}



function doSendAll(username, callBack) {


  var query = new Parse.Query(Parse.User);
  query.equalTo("username", username);  // find all the women

  query.first({
    success: function(user) {

        if (user) {
                callBack(user, "success");
        } else {
                callBack(null, "failure");
        }

    },
    error: function(error) {
      console.log(error.message);
      callBack(new Error(error.message));
    }
  });



}


//jobs


Parse.Cloud.job("freeMinderBatchJob", function(request, status) {
    Parse.Cloud.useMasterKey();
    var query = new Parse.Query(Parse.User);

    query.find().then(function(users) {

        var promises = [];
        _.each(users, function(user) {

            //lets get the user subscriptions and usage details
            var subs = user.toJSON().subs;
            var credits;
            if(!subs) {

                console.log('creating subscription data');
                var today = new Date();

                var afterOneMonth = new Date();
                afterOneMonth.setMonth(today.getMonth() + 1);

                var freePlan = [{'startDate':today.getTime(), 'endDate':afterOneMonth.getTime(), 'bdom': today.getDate(), 'type': 'prepaid', 'frequency':'monthly', 'credits':{'sms':100, 'email':10000},'charges':{'oneoff':0, 'recurring':0}}];
                user.set('subs', freePlan);
                user.save();
                credits = freePlan[0].credits;

            } else {
                   credits = subs[0].credits;
            }
            var usage = user.get('usage');
            var currentUsageRec;
            var currentUsageIdx = 0;

            console.log('usage records '+ usage);

            if(!usage) {
                console.log('creating usage record for the period');
                var today = new Date();

                var afterOneMonth = new Date();
                afterOneMonth.setMonth(today.getMonth() + 1);

                console.log('Usage Dates ' + today + ' ' + afterOneMonth);

                var usageRecs = [];
                var usageRec = {};

                usageRec.startDate = today.getTime();
                usageRec.endDate = afterOneMonth.getTime();
                usageRec.usage = {};
                usageRec.usage.sms = 0;
                usageRec.usage.email = 0;

                usageRecs.push(usageRec);
                user.set('usage', usageRecs);
                user.save();
                currentUsageRec = usageRecs[0];
                usage = usageRecs;

            } else {

                currentUsageIdx = getCurrentUsageRecord(usage);
                if(currentUsageIdx >= 0) {
                    currentUsageRec = usage[currentUsageIdx];
                    console.log('found current usage record ' + currentUsageRec + ' at ' + currentUsageIdx );
                } else {

                    var today = new Date();
                    var afterOneMonth = new Date();
                    afterOneMonth.setMonth(today.getMonth() + 1);
                    console.log('Usage Dates ' + today + ' ' + afterOneMonth);
                    var usageRecs = [];
                    var usageRec = {};

                    usageRec.startDate = (new Date()).getTime();
                    usageRec.endDate = afterOneMonth.getTime();
                    usageRec.usage = {};
                    usageRec.usage.sms = 0;
                    usageRec.usage.email = 0;
                    usage.push(usageRec);
                    user.set('usage', usage);
                    user.save();
                    currentUsageRec = usage[usage.length - 1];

                    console.log('Init new usage record for period ' + usageRec.startDate + ' to ' + usageRec.endDate);


                }
            }


            promises.push((function(user){

                var promise = new Parse.Promise();
                console.log(user.toJSON().username);  // user objectId is correct here

                var contactQuery = new Parse.Query('CustomerDetails');
                contactQuery.equalTo('parentId', user.toJSON().objectId);

                contactQuery.find().then(function(contacts) {  // this doesnt seem to ever run, i have tried .each as well

                    _.each(contacts, function(contact) {

                            console.log('Processing user ' + user.toJSON().username);
                            promises.push((function(contact){
                                var promise = new Parse.Promise();

                                var contactQuery = new Parse.Query('CustomerAction');
                                contactQuery.equalTo('parentId', contact.toJSON().objectId);
                                //contactQuery.containedIn('dom', ['0', new Date().getDate()]);

                                console.log("action query " + contactQuery.toJSON());

                                contactQuery.find({  // this doesnt seem to ever run, i have tried .each as well
                                    success: function(actions) {
                                        var votes = 0;
                                        console.log('processing actions for contact  ' + contact.toJSON().name +
                                                    ' of user ' + user.toJSON().username);
                                        console.log("found " + actions.length);
                                           for (var i=0; i<actions.length; i++) {
                                               var action = actions[i];

                                               console.log(action.toJSON());

                                               var activeSinceStr = action.toJSON().actionsince;
                                               var activeUntilStr = action.toJSON().actionuntil;
                                               var actionNextRunStr = action.toJSON().nextrun;

                                               if((action.toJSON().dom != new Date().getDate()) && (action.toJSON().dom != '0')) {
                                                    continue;
                                               }

                                               var parts = activeSinceStr.split('/');
                                               //please put attention to the month (parts[0]), Javascript counts months from 0:
                                               // January - 0, February - 1, etc
                                               var activeSinceDate = new Date(parts[2],parts[1]-1,parts[0]);
                                               console.log ("active Since " + activeSinceDate);
                                               if(activeSinceDate.getTime() > new Date().getTime()) {
                                                   continue;

                                               }

                                                                   if(actionNextRunStr) {
                                                                            parts = actionNextRunStr.split('/');

                                                                            var actionNextRunDate = new Date(parts[2],parts[1]-1,parts[0]);
                                                                            if((actionNextRunDate.getDate() != new Date().getDate()) ||                                                                                           (actionNextRunDate.getMonth() != new Date().getMonth()) ||
                                                                                (actionNextRunDate.getFullYear() != new Date().getFullYear())) {

                                                                                continue;

                                                                          }
                                                                   }

                                                                   //carry on

                                                                   if(action.toJSON().sms) {
                                                 //check credits before sending SMS
                                                 if(currentUsageRec.usage.sms >= credits.sms) {
                                                     //create push notification to app user
                                                     console.log('Running out of Free Credits ...Upgrade');

                                                 } else {

                                                      //send sms
                                                      //sendSMS(contact.toJSON().mobile, action.toJSON().content, user.toJSON().bname );
                                                      currentUsageRec.usage.sms = currentUsageRec.usage.sms + 1;

                                                 }
                                               }

                                                currentUsageRec.usage.email = currentUsageRec.usage.email + 1;
                                                usage[currentUsageIdx] = currentUsageRec;
                                                user.save('usage', usage);
                                                emailFromInfo = {};
                                                emailFromInfo.username = user.toJSON().bname;
                                                emailFromInfo.email = user.toJSON().email;
                                                sendEmail(contact.toJSON().email, contact.toJSON().name, action.toJSON().content, emailFromInfo);

                                                //update nextrun date for action
                                                var nextRunDate = calcNextRunDate(action.toJSON());

                                                action.save("nextrun", nextRunDate);

                                            }


                                        promise.resolve();

                                    },
                                    error: function(error) {
                                        console.log(error);
                                        //status.error('test reminder failed');
                                    }
                                });

                                return promise;
                            })(contact));



                    });
                    //end of inner contacts loop


                }).then (function() {
                    console.log('Finished processing all contact');
                });


                return promise;
            })(user));
        });
        return Parse.Promise.when(promises);
    }).then(function() {
        console.log('Reminder Process Successfull.');
        status.success('Reminder Process Successfull.');
    });
});

Parse.Cloud.job("SysActionBatchJob", function(request, status) {

    Parse.Cloud.useMasterKey();
    var query = new Parse.Query(Parse.User);

    query.find().then(function(users) {


        var promises = [];
        _.each(users, function(user) {


            //lets get the user subscriptions and usage details
            var subs = user.toJSON().subs;
            var credits;
            if(!subs) {

                console.log('creating subscription data');
                next;
            } else {
                   credits = subs[0].credits;
            }
            var usage = user.get('usage');
            var currentUsageRec;
            var currentUsageIdx = 0;

            console.log('usage records '+ usage);

            if(!usage) {
                console.log('creating usage record for the period');
                var today = new Date();

                var afterOneMonth = new Date();
                afterOneMonth.setMonth(today.getMonth() + 1);

                console.log('Usage Dates ' + today + ' ' + afterOneMonth);

                var usageRecs = [];
                var usageRec = {};

                usageRec.startDate = today.getTime();
                usageRec.endDate = afterOneMonth.getTime();
                usageRec.usage = {};
                usageRec.usage.sms = 0;
                usageRec.usage.email = 0;

                usageRecs.push(usageRec);
                user.set('usage', usageRecs);
                user.save();
                currentUsageRec = usageRecs[0];
                usage = usageRecs;

            } else {

                currentUsageIdx = getCurrentUsageRecord(usage);
                if(currentUsageIdx >= 0) {
                    currentUsageRec = usage[currentUsageIdx];
                    console.log('found current usage record ' + currentUsageRec + ' at ' + currentUsageIdx );
                } else {

                    var today = new Date();
                    var afterOneMonth = new Date();
                    afterOneMonth.setMonth(today.getMonth() + 1);
                    console.log('Usage Dates ' + today + ' ' + afterOneMonth);
                    var usageRecs = [];
                    var usageRec = {};

                    usageRec.startDate = (new Date()).getTime();
                    usageRec.endDate = afterOneMonth.getTime();
                    usageRec.usage = {};
                    usageRec.usage.sms = 0;
                    usageRec.usage.email = 0;
                    usage.push(usageRec);
                    user.set('usage', usage);
                    user.save();
                    currentUsageRec = usage[usage.length - 1];

                    console.log('Init new usage record for period ' + usageRec.startDate + ' to ' + usageRec.endDate);


                }
            }

            promises.push((function(user){
                var promise = new Parse.Promise();
                var contactList = [];
                var contactQuery = new Parse.Query('CustomerDetails');
                contactQuery.equalTo('parentId', user.toJSON().objectId);
                contactQuery.find({
                    success: function(contacts) {
                        for(var i = 0; i < contacts.length; i++) {

                            contactList.push(contacts[i].toJSON());
                        }

                    },
                    error: function(error) {
                        console.log(error);

                    }

                });

                var actionsQuery = new Parse.Query('CustomerAction');
                actionsQuery.equalTo('parentId', user.toJSON().objectId);

                actionsQuery.find({
                    success: function(actions) {
                        for(var i = 0; i < actions.length; i++) {


                            var action = actions[i];
                            processAction(action, currentUsageRec, credits, usage, currentUsageIdx, user, contactList);
                            //update nextrun date for action
                            var nextRunDate = calcNextRunDate(action.toJSON());
                            action.save("nextrun", nextRunDate);
                        }

                    },
                    error: function(error) {
                        console.log(error);

                    }

                });


                return promise;
            })(user));

        }); //end of user loop

        return Parse.Promise.when(promises);

    }).then(function() {
        console.log('Reminder Process Successfull.');
        status.success('Reminder Process Successfull.');
    });


});

Parse.Cloud.job("cutomerPushNotificationJob", function(request, status) {
    Parse.Cloud.useMasterKey();
    //query all users,
    //check the credit balance, if they running out of balance (90%) or ran outof
   //send notification via mobile push or email

   var query = new Parse.Query(Parse.User);

   query.find().then(function(users) {
     _.each(users, function(user) {

       var message = "Dear Freeminder User, Your free cerdit of SMS balance for current cycle is reaching threshold. To continue sending reminders to your contacts, please topup.";
       var fromInfo = {};
       fromInfo.username = "Freeminder Admin";
       var subs = user.toJSON().subs;
       var usage = user.get('usage');
       var credits = subs[0].credits;

       var currentUsageIdx = getCurrentUsageRecord(usage);
       var currentUsageRec = {};

       if(currentUsageIdx >= 0) {
           currentUsageRec = usage[currentUsageIdx];

       } else {

         console.log('cannot find current usage record for ' + user.toJSON().username );
         next;
       }


       var threshold = (parseInt(currentUsageRec.usage.sms)/parseInt(credits.sms) ) * 100;

       console.log('USAGE threshold is : ' + threshold );

       if(threshold >= 90 || (credits.sms <= currentUsageRec.usage.sms)) {
        //push notification
        sendEmail(user.toJSON().email, user.toJSON().bname, message, fromInfo );
       }

     });

     status.success('Push Notification Process Successfull.');

   });


});

Parse.Cloud.job("pruneOnetimeActions", function(request, status) {

    Parse.Cloud.useMasterKey();
    status.success('Reminder Process Successfull.');

});


/*Parse.Cloud.job("billUserBatchJob", function(request, status) {
    Parse.Cloud.useMasterKey();

    var query = new Parse.Query(Parse.User);

    query.find().then(function(users) {

        success: function(users) {

            _.each(users, function(user) {

                //lets get the user subscriptions and usage details
                var subs = user.toJSON().subs;
                var credits = subs.credits;
                var usage = user.toJSON().usage;
                //push notification to remind the user about renewal of service
                //send summary of usage etc.
                var message = "Dear Bwise user. We have successfully renewed your service. Please see your last month usage summary";
                sendEmail(user.toJSON().email, user.toJSON().username, message);

                //push notification also


            }


        },

        error: function(err) {
            console.log(err);
            status.error('Billing Process Failed');

        }


    }).then().fucntion() {
        status.success('Billing Process Successfull.');
    }; */
