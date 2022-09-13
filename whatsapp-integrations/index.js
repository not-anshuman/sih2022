const express = require("express");
const body_parser = require("body-parser");
const axios = require("axios");

var notifier = require("./notifier.js")
var whatsapp_api = require("./whatsapp_api")

require('dotenv').config();


const fs = require('firebase-admin');
const FieldValue = fs.firestore.FieldValue;
const serviceAccount = JSON.parse(process.env.SAK);
fs.initializeApp({
    credential: fs.credential.cert(serviceAccount)
});

const db = fs.firestore();
const usersDb = db.collection('users');
const tmp = db.collection('tmp');
const emergencyDb = db.collection('emergency');
const app = express().use(body_parser.json());
const token = process.env.TOKEN;
const mytoken = process.env.MYTOKEN; //dEvElOpErAnK
const port = process.env.PORT || 8000;
app.listen(port, () => {
    console.log("webhook is listening on ", port);
});

//key : phone, value : lastTimeFaceScanned
let scannedFaceData = new Map();

//bool isOutside

// updateEntryInfo('919644311616');

async function updateEntryInfo(userId) {

    try {
        const userJson = {
            number: userId,
            exitEntries: [],
            attendance: [],
            parents: []
        };
        const userDoc = await usersDb.doc(userId);

        const user = await userDoc.get();

        if (user.exists) {
            console.log("user already exists");
            var curr = new Date();
            console.log(curr);
            userDoc.update(
                { exitEntries: FieldValue.arrayUnion(curr) }
            );
        } else {
            console.log("user doesn't exists, creating new");
            userDoc.set(userJson);
        }

        console.log(userDoc);
    }
    catch (error) {
        console.log(error);
    }
}


//not impletmented
function isLegitRequest(userId) {
    var currTime = new Date();
    var hasEntry = scannedFaceData.has(userId);

    if (hasEntry) {

        const lastScannedTime = scannedFaceData[userId];
        if (lastScannedTime.day < currTime.day || lastScannedTime.hours - currTime.hours >= 1 || lastScannedTime.minutes - currTime.minutes <= 5) {
            scannedFaceData[userId] = currTime;
            console.log('face scanned and received legit request');
            return true;
        } else {
            console.log('getting request from whatsapp without face scan');
            return false;
        }
    } else {
        console.log('first time logging entry in lastScannedTime');
        scannedFaceData[userId] = currTime;
        return true;
    }
}


async function isGoingOut() {

}




///admin presses the button and notifies
app.get("/notifyAllParents", (req, res) => {
    try {
        notifier.notifyAttendanceRecordToAllParents(usersDb, token)
        return res.sendStatus(200);
    } catch (e) {
        res.status(500);
        return res.send("server side error : " + e);
    }
});




///python server is sending this request
app.post("/send_wa_msg", (req, res) => {
    try {
        const obj = req.body.list;
        console.log(obj);
        for (var i = 0; i < obj.length; i++) {
            ///check if the user is not fooling
            // if (isLegitRequest(obj[i])) {
            whatsapp_api.send_wa_template(obj[i], "letmeleave");
            // }
        }
        return res.sendStatus(200);
    }
    catch (e) {
        console.log(e);
        return res.sendStatus(500);
    }
});



async function updateAtt(userId) {
    try {

        const doc = await tmp.doc(userId);
        const user_atten_doc = await doc.get();

        var datetime = new Date();
        // let date = ("0" + date_ob.getDate()).slice(-2);
        const key = datetime.toISOString().slice(0, 10)
        if (user_atten_doc.exists) {
            console.log("user_attendance already exists, now updating");

            // console.log(curr);
            doc.update(
                {
                    [`attendance.${key}`]: FieldValue.increment(1)
                }
            );
        } else {

            const newUser = {
                attendance: {}
            };

            console.log("user doesn't exists, creating new");
            await doc.set(newUser);
            doc.update(
                {
                    [`attendance.${key}`]: FieldValue.increment(1)
                }
            );
        }
        console.log(user_atten_doc);
    }
    catch (error) {
        console.log(error);
    }

}

app.post("/mark_attendance", async (req, res) => {
    try {
        const obj = req.body.list;
        console.log(obj);
        for (var i = 0; i < obj.length; i++) {
            console.log("user id = ", obj[i])
            updateAtt(obj[i])
        }
        return res.sendStatus(200);
    }
    catch (e) {
        console.log(e);
        return res.sendStatus(500);
    }
});

///get /webhook is for verification
app.get("/webhook", (req, res) => {
    let mode = req.query["hub.mode"];
    let challange = req.query["hub.challenge"];
    let token = req.query["hub.verify_token"];


    if (mode && token) {

        if (mode === "subscribe" && token === mytoken) {
            res.status(200).send(challange);
        } else {
            res.status(403);
        }

    }

});

//anshuman wa number
// whatsapp_api.send_text_whatsapp_msg('NUMBER', "https://google.com")

//"Click the below link to see the attendance record of your ward"

///when user sends any msg, it is send to /webhook endpoint
app.post("/webhook", async (req, res) => {
    try {
        let body_param = req.body;
        console.log("hitting post /webhook");

        console.log(JSON.stringify(body_param, null, 2));

        if (body_param.object) {
            console.log("inside body param");
            if (body_param.entry &&
                body_param.entry[0].changes &&
                body_param.entry[0].changes[0].value.messages &&
                body_param.entry[0].changes[0].value.messages[0]
            ) {
                // let phon_no_id = body_param.entry[0].changes[0].value.metadata.phone_number_id;
                let from = body_param.entry[0].changes[0].value.messages[0].from;
                let messages = body_param.entry[0].changes[0].value.messages[0]


                if (messages.text && messages.text.body) {
                    var msg = messages.text.body;
                    if (msg === "attendance" || msg === "Attendance") {
                        notifier.send_back_attendance(from, usersDb);
                    }
                    else {
                        // when any random text is send by user,
                        //a whatsapp msg with text 'invalid request' will be send back
                        await whatsapp_api.send_text_whatsapp_msg(from, "invalid request")
                        whatsapp_api.send_wa_template(from, "help")
                    }
                } else if (messages.button) {

                    //when user reply to our template then updateDb and send an response back to user
                    let button = messages.button;
                    let resp_text = button.text;

                    //TODO: coming-back logic is remaining
                    let reply_body = "Your entry/exit is marked, you are allowed to leave";

                    updateEntryInfo(from);

                    whatsapp_api.send_entry_success(from, reply_body, usersDb);
                }
                else if (messages.location) {
                    whatsapp_api.send_wa_sos(from, usersDb, emergencyDb, messages.location);
                }
                res.sendStatus(200);


            } else {
                res.sendStatus(404);
            }

        } else {
            res.sendStatus(501);
        }
    }
    catch (e) {
        console.log(e);
        return res.sendStatus(500);
    }

});

///this is test api call not in use anymore : mobile no is harded coded
app.get("/", (req, res) => {
    return res.sendStatus(200);
    try {
        console.log("hitting / ");
        // res.status(200).send("hello this is webhook setup");
        axios({
            method: "POST",
            url: "https://graph.facebook.com/v13.0/101016069409249/messages?access_token=" + token,
            data: {
                messaging_product: "whatsapp",
                to: "917740888041",
                // text:{
                //     body:"Hi, this is developerank, your message is :)"
                // }
                type: "template",
                template: {
                    name: "leaving_template",
                    language: {
                        code: "en"
                    }
                }
            },
            headers: {
                "Content-Type": "application/json"
            }

        });

        res.sendStatus(200);
    }
    catch (e) {
        console.log(e);
        return res.sendStatus(500);
    }
});

// whatsapp_api.send_entry_success("NUMBER", "hehe", usersDb);
// notifier.notifyAttendanceRecordToAllParents(usersDb);
// notifier.send_back_attendance("NUMBER", usersDb);
// whatsapp_api.send_wa_template("NUMBER", "letmeleave")


// whatsapp_api.send_wa_sos("NUMBER", usersDb, emergencyDb,

//     {
//         "latitude": 47.8014334,
//         "longitude": 47.8957438
//     }

// );