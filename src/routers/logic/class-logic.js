const getQuizByType = async (quizType, indexes) => {
    if (quizType === 'PicQuizz')
        return await PicQuizz.findOne(indexes);
    else if( quizType === 'Scribbly')
        return await Scribbly.findOne(indexes);
    // else
    //     return await quizType.findOne(indexes);
}


module.exports = {
    getQuizByType
}