const findGroupStudentWorkByUserId = (studentWorks, userId) => {
    return studentWorks.find(work => work.author.includes(userId))
}

const findGroupStudentWorkByUserAccount = (studentWorks, user) => {
    return studentWorks.find(work => work.author.some(auth => auth.account === user.account));
}

const findGroupStudentWorkByUserId_Obj = (studentWorks, userId) => {
    return studentWorks.find(curWork => {
        return curWork.author.map(auth => JSON.stringify(auth))
                             .includes(JSON.stringify(userId))
    });
}

const checkWhetherUserReactedOrNot = (reactList, user) => {
    return reactList.includes(user._id);
}

const buildReturnedObjectNeedToDo = (needToDoList, user) => {
    const needToDoListObj = needToDoList.map(quiz => quiz.toJSON());
    needToDoListObj.forEach(quiz => {
        if (quiz.scribblyType === 'group') {
            const work = findGroupStudentWorkByUserId_Obj(quiz.studentWorks, user._id);
            if (work.studentWorkURL) 
                quiz.studentWorkURL = work.studentWorkURL;
            quiz.isTaken = work.status;
        }
        delete quiz.studentWorks;
        quiz.status = 'to-do';
    });
    return needToDoListObj;
}

const buildReturnedObjectFinished = (finished, user) => {
    finishedObj = finished.map(quiz => quiz.toObject());
        
    finishedObj.forEach(quiz => {
        quiz.status = 'finished';
        quiz.studentWorks.forEach(work => {
            work.isHahaVoted = work.hahaReact.some(id => JSON.stringify(id) === JSON.stringify(user._id));
            work.isWowVoted = work.wowReact.some(id => JSON.stringify(id) === JSON.stringify(user._id));
            work.isLoveVoted = work.loveReact.some(id => JSON.stringify(id) === JSON.stringify(user._id));
            work.author.forEach(auth => {
                auth.avatarURL = process.env.DOMAIN + "api/users/" + auth.account + "/avatar";
            });

            if (work.studentWork)
                work.studentWorkURL = `${process.env.DOMAIN}api/scribbly-work/img/${work._id}`;
        
            work.loveReact = work.loveReact.length;
            work.hahaReact = work.hahaReact.length;
            work.wowReact = work.wowReact.length;

            work.loveReactAPI_URL = `${process.env.DOMAIN}api/scribbly/react/loveReact/${work._id}`;
            work.wowReactAPI_URL = `${process.env.DOMAIN}api/scribbly/react/wowReact/${work._id}`;
            work.hahaReactAPI_URL = `${process.env.DOMAIN}api/scribbly/react/hahaReact/${work._id}`;

            delete work.studentWork;
        });
        quiz.myWork = quiz.studentWorks.find(work => 
                            work.author.some(auth => auth.account === user.account));
        quiz.classmateWork = quiz.studentWorks.filter(work => 
                                    (!work.author.some(auth => auth.account === user.account) &&
                                    (work.curTaskDesc >= work.author.length || quiz.scribblyType === 'individual')));
        delete quiz.studentWorks;
    });
    return finishedObj;
}

module.exports = {
    findGroupStudentWorkByUserId,
    findGroupStudentWorkByUserAccount,
    checkWhetherUserReactedOrNot,
    buildReturnedObjectNeedToDo,
    buildReturnedObjectFinished
}