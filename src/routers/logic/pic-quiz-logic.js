const FillInBlankQuestion = require('../../models/fill-in-blank-question');
const MultipleChoiceQuestion = require('../../models/multiple-choice-question');
const PicQuizz = require('../../models/pic-quiz');

const getDocumentByType = (questionType, obj) => 
    questionType === 'fill-in-blank' ? new FillInBlankQuestion(obj) : new MultipleChoiceQuestion(obj);

const getModelNameByType = (questionType) => 
    questionType === 'fill-in-blank' ? 'FillInBlankQuestion' : 'MultipleChoiceQuestion';

const findQuestionByType = async (questionType, indexes) =>
    questionType === 'fill-in-blank' 
                 ? await FillInBlankQuestion.findOne(indexes) 
                 : await MultipleChoiceQuestion.findOne(indexes);

const deleteQuestionByType = async (questionType, indexes) =>
    questionType === 'FillInBlankQuestion' 
                ? await FillInBlankQuestion.deleteOne(indexes) 
                : await MultipleChoiceQuestion.deleteOne(indexes);

const findOneAndPopulateQuiz = async (indexes) => await PicQuizz.findOne(indexes)
                                                               .populate('smallQuestions.info');

module.exports = {
    getDocumentByType,
    getModelNameByType,
    findQuestionByType,
    deleteQuestionByType,
    findOneAndPopulateQuiz
}