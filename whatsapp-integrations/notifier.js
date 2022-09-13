const QuickChart = require('quickchart-js');
var shortUrl = require("node-url-shortener");

const chart = new QuickChart();

const whatsapp_api = require("./whatsapp_api")
const token = "EAAGrkPNC75UBADI5wU6LqlVNcAU313fIaKUcPdooSIAWZBOTHlNCDDlN2Vw93r0fsdcql2Tf4IACV3iBRm3eUGFd338eHWj6GRKjtdZADOc6WUHGEmLhlpOaEhtL9tgUi6kHsRPLrZCZAC8u9pXkyGJ42K8a1jgJpVbdYiMfVR9VAyCUCEZAF"



async function notifyAttendanceRecordToAllParents(usersDb) {
    try {
        const allUsersDoc = await usersDb.get();
        allUsersDoc.docs.forEach(user => {
            // console.log(user.id)
            const parentsNo = user.data().parents;
            //TODO
            const name = user.data().name;

            for (var i = 0; i < parentsNo.length; i++) {
                const parent_no = parentsNo[i];
                var url = "https://quickchart.io/chart?c={type:%27bar%27,data:{labels:[%27Mon%27,%27Tue%27,%27Wed%27,%27Thru%27,%27Friday%27],datasets:[{label:%27Attendance%20Record%20of%20" + name + "%27,data:[4,5,3,6,2]}]}}&w=500&h=300&bkg=transparent&f=png";

                shortUrl.short(url, function (err, short_url) {
                    console.log(parent_no + " " + name);
                    // console.log(short_url);
                    // console.log('sending to parent ', phone)
                    whatsapp_api.send_text_whatsapp_msg(parent_no, "Check the attendance record of " + name + " of last week : " + short_url);
                });
            }



            // sendWaMsg();
        });
    }
    catch (e) {
        console.log(e);
    }
}

async function send_back_attendance(to, usersDb) {
    try {
        const user = await usersDb.doc(to).get();
        const name = user.data().name;
        var url = "https://quickchart.io/chart?c={type:%27bar%27,data:{labels:[%27Mon%27,%27Tue%27,%27Wed%27,%27Thru%27,%27Friday%27],datasets:[{label:%27Attendance%20Record%20of%20" + name + "%27,data:[4,5,3,6,2]}]}}&w=500&h=300&bkg=transparent&f=png";

        shortUrl.short(url, function (err, short_url) {
            whatsapp_api.send_text_whatsapp_msg(to, "Here is the attendance record of you from last week : " + short_url);
        });
    }
    catch (e) {
        console.log(e);
    }
}





module.exports = {
    notifyAttendanceRecordToAllParents,
    send_back_attendance
}

