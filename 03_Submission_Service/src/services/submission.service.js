const { fetchProblemDetails } = require('../apis/problemAdmin.api');
const SubmissionCreationError = require('../errors/submissionCreation.error');
const submissionProducer = require('../producers/submission.producer');

class SubmissionService{
    constructor(submissionRepository){
        this.submissionRepository=submissionRepository;
    }

    async addSubmission(submissionPayload){

        //hit the problem admin service and fetch the problem details
        const problemId=submissionPayload.problemId;
        const problemAdminResponse=await fetchProblemDetails(problemId);

        if(!problemAdminResponse){
            throw new SubmissionCreationError('Failed to create a submission in the repository');
        }

        const languageCodeStub=problemAdminResponse.data.codeStubs.find(codeStub=>codeStub.language.toLowerCase()===submissionPayload.language.toLowerCase());


        submissionPayload.code=languageCodeStub.startSnippet + "\n\n" + submissionPayload.code + "\n\n" + languageCodeStub.endSnippet;


        const submission=await this.submissionRepository.createSubmission(submissionPayload);
        if(!submission){
            throw new SubmissionCreationError('Failed to Create a submission in the repository');
        }


        //adding submission to the producer then Queue
        const response=await submissionProducer({
            [submission._id]:{
                code:submission.code,
                language:submission.language,
                inputCase:problemAdminResponse.data.testCases[0].input,
                outputCase:problemAdminResponse.data.testCases[0].output,
                userId:submissionPayload.userId,
                submissionId:submission._id
            }
        });
        return {queueResponse:response,submission};
    }
}

module.exports=SubmissionService;