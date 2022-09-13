const axios = require("axios");
const dotenv = require('dotenv');
const token = "EAAGrkPNC75UBADI5wU6LqlVNcAU313fIaKUcPdooSIAWZBOTHlNCDDlN2Vw93r0fsdcql2Tf4IACV3iBRm3eUGFd338eHWj6GRKjtdZADOc6WUHGEmLhlpOaEhtL9tgUi6kHsRPLrZCZAC8u9pXkyGJ42K8a1jgJpVbdYiMfVR9VAyCUCEZAF"


function send_wa_template(mobile_no, temp_name) {

    // const token = process.env.TOKEN;

    try {
        axios({
            method: "POST",
            url: "https://graph.facebook.com/v13.0/101016069409249/messages?access_token=" + token,
            data: {
                messaging_product: "whatsapp",
                to: mobile_no,
                type: "template",
                template: {
                    name: temp_name,
                    language: {
                        code: "en"
                    }
                }
            },
            headers: {
                "Content-Type": "application/json"
            }
        });
    }
    catch (error) {
        console.log("error sending template to user ---> ", error);
    }
}


async function send_entry_success(to, msg, usersDb) {

    try {
        send_text_whatsapp_msg(to, msg);

        const user = await usersDb.doc(to).get();
        const parentsNo = user.data().parents;
        const name = user.data().name;

        for (var i = 0; i < parentsNo.length; i++) {
            const parent_no = parentsNo[i];
            send_text_whatsapp_msg(parent_no, "Your ward, " + name + ", is leaving the campus");
        }
    } catch (e) {
        console.log(e)
    }

}

async function send_text_whatsapp_msg(to, msg) {

    // const token = process.env.TOKEN;

    try {
        await axios({
            method: "POST",
            url: "https://graph.facebook.com/v13.0/101016069409249/messages?access_token=" + token,
            data: {
                messaging_product: "whatsapp",
                to: to,
                text: {
                    body: msg
                }
            },
            headers: {
                "Content-Type": "application/json"
            }
        });
    } catch (e) {
        console.log("error sending whatsapp msg to user ---> ", e)
    }

}

async function send_wa_sos_util(to, location, msg) {
    try {
        axios({
            method: "POST",
            url: "https://graph.facebook.com/v13.0/101016069409249/messages?access_token=" + token,
            data: {
                messaging_product: "whatsapp",
                to: to,
                type: "location",
                location: location
            },
            headers: {
                "Content-Type": "application/json"
            }
        });
        send_text_whatsapp_msg(to, msg);
    } catch (e) {
        console.log("error sending whatsapp msg to user ---> ", e)
    }
}

async function send_wa_sos(from, usersDb, emergencyDb, location) {
    try {
        const userDoc = await usersDb.doc(from).get();
        console.log(userDoc.data());
        const sosDoc = await emergencyDb.doc("sos").get();
        console.log(sosDoc.data());

        if (userDoc.exists) {
            for (var i = 0; i < userDoc.data().parents.length; i++) {
                send_wa_sos_util(userDoc.data().parents[i], location, "Your ward might be in emergency, we have informed concerned authorities. Kindly contact the institute for more details.");
            }
        }

        for (var i = 0; i < sosDoc.data().contacts.length; i++) {
            send_wa_sos_util(sosDoc.data().contacts[i], location, "Your institute student " + userDoc.data().name + " might be in emergency, kindly reach out to this location.");
        }
    }
    catch (e) {
        console.log("error sending whatsapp msg to user ---> ", e)
    }
}

// send_wa_sos("918440003347");


module.exports = {
    send_text_whatsapp_msg,
    send_wa_template,
    send_wa_sos,
    send_entry_success
}