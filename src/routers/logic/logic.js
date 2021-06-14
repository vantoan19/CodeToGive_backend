const sharp = require('sharp');
const Class = require('../../models/class');

const imageBufferProcess = async (originBuffer, width) => 
    await sharp(originBuffer).resize({ fit: sharp.fit.contain, width })
                             .png()
                             .toBuffer();


const injectQuizToUser = async (quizDoc, userDoc) => {
    if (userDoc.takenQuizzes.every(quiz => JSON.stringify(quiz.quiz._id) !== JSON.stringify(quizDoc._id.str))) {
        userDoc.takenQuizzes.push({
            quiz: quizDoc,
            quizType: quizDoc.quizType
        });
        await userDoc.save();
    } 
}

const removeQuizFromUser = async (quizDoc, userDoc) => {
    userDoc.takenQuizzes = userDoc.takenQuizzes.filter(quiz => {
        return quiz.quiz !== quizDoc;
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

const removeQuizFromClass = async (quizDoc, classDoc) => {
    classDoc.quizList = classDoc.quizList.filter(quiz => {
        return quiz.quiz !== quizDoc;
    });
    await classDoc.save();
}

const injectUserToClass = async (userDoc, classDoc) => {
    classDoc.studentList.push(userDoc);
    await classDoc.save();
}

const removeUserFromClass = async (userDoc, classDoc) => {
    classDoc.studentList = classDoc.studentList.filter(user => {
        return user !== userDoc;
    });
    await classDoc.save();
}

const injectStudentworkToQuiz = async (studentworkDoc, quizDoc) => {
    quizDoc.studentWorks.push(studentworkDoc);
    await quizDoc.save();
}

const removeStudentworkFromQuiz = async (studentworkDoc, quizDoc) => {
    quizDoc.studentWorks = quizDoc.studentWorks.filter(work => {
        return work !== studentworkDoc;
    });
    await quizDoc.save();
}

const injectClassInformationToStudent = async (classDoc, studentDoc) => {
    studentDoc.classes.push(classDoc);
    await studentDoc.save();
}

const removeClassInformationFromStudent = async (classDoc, studentDoc) => {
    studentDoc.classes = studentDoc.classes.filter(curClass => {
        return curClass !== classDoc;
    });
    await studentDoc.save();
}

const injectStudentToClass = async (studentDoc, classDoc) => {
    classDoc.studentList.push(studentDoc);
    await classDoc.save();
}

const removeStudentFromClass = async (studentDoc, classDoc) => {
    classDoc.studentList = classDoc.studentList.filter(student => {
        return student !== studentDoc;
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

    const classDoc = await Class.findOne({ classId: quiz.class });
    if (!classDoc) {
        quiz.remove();
        throw new Error('Class does not exist!');
    }
    await injectQuizToClass(quiz, classDoc);

    return quiz;
}


const getUserQuizzes = (user) => user.classes.map(async curClass => {
    const classDoc = await Class.findOne({ 
        _id: curClass._id 
    });
    if (classDoc) {
        await classDoc.populate('quizList.quiz')
                      .execPopulate();
        return classDoc.quizList;
    }
    return [];
});


const suffle = (users) => { 
    for(let j, x, i = users.length; i; j = Math.floor(Math.random() * i), 
                                       x = users[--i], 
                                       users[i] = users[j], 
                                       users[j] = x);
    return users;
};  

const getRandomGroups = (users, groupSize) => {
    users = suffle(users);
    let groups = [];
    let numGroups = Math.floor((parseInt(users.length) + parseInt(groupSize) - 1) / parseInt(groupSize));
    let numGreaterGroups = parseInt(users.length) % parseInt(numGroups);
    if (numGreaterGroups === 0)
        numGreaterGroups = numGroups;
    for (let i = 0, j = 0; i < numGroups; ++i) {
        let size = i < parseInt(numGreaterGroups) ? parseInt(groupSize) : parseInt(groupSize) - 1;
        groups.push(users.slice(j, j+size));
        j += size;
    }
    return groups;
}
 
module.exports = {
    imageBufferProcess,
    injectQuizToUser,
    removeQuizFromUser,
    injectQuizToClass,
    removeQuizFromClass,
    injectUserToClass,
    removeUserFromClass,
    injectStudentworkToQuiz,
    removeStudentworkFromQuiz,
    injectClassInformationToStudent,
    removeClassInformationFromStudent,
    injectStudentToClass,
    removeStudentFromClass,
    createDocument,
    updateDocument,
    createQuiz,
    getUserQuizzes,
    getRandomGroups
}