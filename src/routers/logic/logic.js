const sharp = require('sharp');
const Class = require('../../models/class');

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

const createQuiz = async (Model, data) => {
    const quiz = await createDocument(Model, data);

    quiz.classes.forEach(async classId => {
        const classDoc = await Class.findOne({ classId });
        classDoc && await injectQuizToClass(quiz, classDoc);
    });

    return quiz;
}


const getUserQuizzes = (user) => user.classes.map(async curClass => {
    const classDoc = await Class.findOne({ _id: curClass._id });
    if (classDoc) {
        await classDoc.populate('quizList.quiz').execPopulate();
        return classDoc.quizList;
    }
    return [];
});
 
module.exports = {
    imageBufferProcess,
    injectQuizToUser,
    injectQuizToClass,
    injectUserToClass,
    injectUserToClass,
    injectParticipantToQuiz,
    createDocument,
    updateDocument,
    createQuiz,
    getUserQuizzes
}