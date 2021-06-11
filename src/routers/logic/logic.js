const sharp = require('sharp');

const imageBufferProcess = async (originBuffer, width) => 
    await sharp(originBuffer).resize({ fit: sharp.fit.contain, width })
                             .png()
                             .toBuffer();


const injectQuizToUser = async (quizDoc, userDoc) => {
    userDoc.quizzes.push({
        quiz: quizDoc,
        quizType: quizDoc.quizType
    });
    await userDoc.save();
}

const injectQuizToClass = async (quizDoc, classDoc) => {
    classDoc.quizList.push({
        quiz: quizDoc,
        quizType: quizDoc.quizType
    });
    await classDoc.save();
}

const injectUserToClass = async (userDoc, classDoc) => {
    classDoc.studentList.push(userDoc);
    await classDoc.save();
}

const injectParticipantToQuiz = async (userDoc, quizDoc, score, takenDate, duration) => {
    quizDoc.participants.push({
        participant: userDoc,
        score,
        takenDate,
        duration
    });
    await classDoc.save();
}

const createDocument = async (Model, data) => {
    const doc = new Model(data);
    await doc.save();
    return doc;
}

const updateDocument = async (document, updates) => {
    updatesKey = Object.keys(updates);
    updatesKey.forEach(key => document[key] = updates[key]);
    await document.save();
}
 
module.exports = {
    imageBufferProcess,
    injectQuizToUser,
    injectQuizToClass,
    injectUserToClass,
    injectUserToClass,
    injectParticipantToQuiz,
    createDocument,
    updateDocument
}