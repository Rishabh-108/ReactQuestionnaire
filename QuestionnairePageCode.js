import { Alert, Button, Box, Container, Grid, Typography } from "@mui/material";
import * as Yup from "yup";

// form
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { LoadingButton } from "@mui/lab";

import { useTheme } from "@mui/material/styles";
import { m, useMotionValue, useSpring } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Questionnaire from "../../sections/@dashboard/company/risk-assessment/Questionnaire";
import NumberStepper from "../../components/stepper/NumberStepper";

import LoadingScreen from "../../components/loading-screen";
import { questions } from "../../_mock/arrays/_riskQuestionnaire";
import { QuestionnaireContext } from "./contexts/QuestionnaireContext";
import { PATH_DASHBOARD } from "../../routes/paths";

import FormProvider from "../../components/hook-form";

/**
 * Gives the id and response type of each question to help build the Yup schema
 * @param {array} questions
 * @returns {array} [{id: 'questionId', responseType: 'responseType',  required: boolean}]
 */
function groupQuestionsByCategory(questions) {
  const groupedQuestions = {};
  questions.forEach((listItem) => {
    if (groupedQuestions[listItem.category]) {
      groupedQuestions[listItem.category].push(listItem);
    } else {
      groupedQuestions[listItem.category] = [listItem];
    }
  });
  // return an array based on groupedQuestions
  return Object.keys(groupedQuestions).map((key) => ({
    category: key,
    questions: groupedQuestions[key],
  }));
}

const groupedQuestions = groupQuestionsByCategory(questions);

function RiskAssessmentQuestionnairePage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const progress = useMotionValue(0);

  const [responseMap, setResponseMap] = useState({
    100: ["SIEM", "Ticket Management", "Vulnerability Management", "Cloud Monitoring"],
    1: "101-500",
    2: "1-5",
    3: [
      "SIEM",
      "Ticket Management",
      "Vulnerability Management",
      "Endpoint Monitoring",
      "Cloud Monitoring",
      "Application Monitoring",
      "Network Monitoring",
      "Cloud Monitoring",
    ],
    4: "23800",
    22: "34000",
    20: "1200",
    13: "250",
    14: "300",
    19: "800",
    5: "No",
    6: ["Network Infrastructure", "Cloud Infrastructure"],
    7: "Yes",
    11: "Monthly",
    8: "No",
  });

  const theme = useTheme();

  const scaleX = useSpring(progress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const progressBar = (
    <m.div
      style={{
        top: 0,
        left: 0,
        right: 0,
        height: 6,
        zIndex: 1999,
        position: "fixed",
        transformOrigin: "0%",
        backgroundColor: theme.palette.primary.main,
        scaleX,
      }}
    />
  );

  /**
   * Gives the id and response type of each question to help build the Yup schema
   * @param {array} questions
   * @returns {array} [{id: 'questionId', responseType: 'responseType',  required: boolean}]
   */
  function getQuestionResponseTypes(questions) {
    return questions.reduce((acc, question) => {
      // Add main question to response types array
      acc.push({
        id: question.id,
        responseType: question.responseType,
        required: question.required,
      });

      // If the question has subquestions, recursively call the function
      if (question.subQuestions) {
        const subQuestionResponseTypes = getQuestionResponseTypes(question.subQuestions);
        acc.push(...subQuestionResponseTypes);
      }

      return acc;
    }, []);
  }

  const reducedQuestions = getQuestionResponseTypes(questions);

  const QuestionnaireSchema = Yup.object().shape(
    reducedQuestions
      .filter((question) => question.responseType !== null)
      .reduce((acc, question) => {
        const key = question.id;
        let value = question.required ? Yup.string().required("Required") : Yup.string();

        if (question.responseType === "multiselect" || question.responseType === "checkbox") {
          value = question.required ? Yup.array().required("Required") : Yup.array();
        }

        return { ...acc, [key]: value };
      }, {})
  );

  const methods = useForm({
    resolver: yupResolver(QuestionnaireSchema),
  });

  const {
    reset,
    setError,
    handleSubmit,
    clearErrors,
    trigger,
    setValue,
    formState: { errors, isSubmitting },
  } = methods;

  const onSubmit = () => {
    try {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        navigate(`${PATH_DASHBOARD.company.riskAssessmentQuestionnaire}/completed`);
      }, 2000);
    } catch (error) {
      reset();
      setError("afterSubmit", {
        ...error,
        message: error.message,
      });
    }
  };

  /**
   * Handles the change in the response field.
   * @param {object} event
   * @param {index} listItem
   */
  const handleResponseChange = (event, listItem) => {
    setResponseMap({
      ...responseMap,
      [listItem.id]: event.target.value,
    });
  };

  const totalFields = useCallback((questions) => {
    let total = 0;
    questions.forEach((question) => {
      if (question.required === true) total += 1;
      if (question.subQuestions?.length > 0) {
        total += totalFields(question.subQuestions);
      }
    });
    return total;
  }, []);

  // calculate the progress bar percentage
  useEffect(() => {
    const total = totalFields(questions);
    const filled = filledFields(responseMap);
    progress.set(filled / total);
  }, [responseMap, progress, totalFields]);

  // check how many fields have been filled in the responseMap object
  const filledFields = (responseMap) => {
    let total = 0;
    Object.keys(responseMap).forEach((key) => {
      if (responseMap[key]) {
        if (
          responseMap[key].length > 0 ||
          // check if its a string
          (typeof responseMap[key] === "string" && responseMap[key] !== "")
        ) {
          total += 1;
        } else {
          // delete the key from the responseMap
          delete responseMap[key];
        }
      }
    });
    return total;
  };

  // Dynamic stepper labels based on questions grouped by category
  const steps = groupedQuestions.reduce((acc, question) => {
    if (!acc.includes(question.category)) {
      const categoryLabel = `${question.category.charAt(0).toUpperCase()}${question.category.slice(1).replace("_", " ")}`;
      acc.push(categoryLabel);
    }
    return acc;
  }, []);

  const [activeStep, setActiveStep] = useState(0);
  const [completed, setCompleted] = useState({});

  const totalSteps = () => steps.length;

  const completedSteps = () => Object.keys(completed).length;

  const isLastStep = () => activeStep === totalSteps() - 1;

  const allStepsCompleted = () => completedSteps() === totalSteps();

  /**
   * Dynamically handles the next button click for the stepper component.
   * Checks if all required fields are filled and in the responseMap object.
   */
  const handleNext = () => {
    clearErrors();

    const currentStepQuestions = groupedQuestions[activeStep].questions;
    const getCurrentStepQuestionIds = (questions) =>
      questions.reduce((acc, question) => {
        if (question.responseType !== null) acc.push(question.id);

        if (question.subQuestions) {
          const subQuestionIds = getCurrentStepQuestionIds(question.subQuestions);
          acc.push(...subQuestionIds);
        }
        return acc;
      }, []);

    const currentStepQuestionIds = getCurrentStepQuestionIds(currentStepQuestions);
    const currentStepQuestionIdsInResponseMap = currentStepQuestionIds.filter((id) => Object.keys(responseMap).includes(`${id}`));

    const schemaFields = QuestionnaireSchema.fields;
    // QuestionnaireSchema.fields .exclusiveTests .required
    const requiredSchemaNodesKeys = Object.keys(schemaFields).filter((key) => QuestionnaireSchema.fields[key].exclusiveTests.required);

    // find the intersection between currentStepQuestionIds and requiredSchemaNodesKeys
    const intersection = currentStepQuestionIds.filter((value) => requiredSchemaNodesKeys.includes(`${value}`));

    // check if the intersected items are there as keys in the responseMap object
    const allRequiredFiledsAreFilled = intersection.every((id) => Object.keys(responseMap).includes(`${id}`));

    if (!allRequiredFiledsAreFilled) {
      currentStepQuestionIds.forEach((id) => {
        if (!currentStepQuestionIdsInResponseMap.includes(id)) {
          trigger(`${id}`);
        }
      });
    } else {
      const newCompleted = completed;
      newCompleted[activeStep] = true;
      setCompleted(newCompleted);
      const newActiveStep =
        isLastStep() && !allStepsCompleted()
          ? // It's the last step, but not all steps have been completed,
            // find the first step that has been completed
            steps.findIndex((step, i) => !(i in completed))
          : activeStep + 1;

      setActiveStep(newActiveStep);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleStep = (step) => () => {
    // only if the current step is completed
    if (completed[step]) {
      setActiveStep(step);
    }
  };

  // sets values for input fields manually-- only for the sake of the demo!
  useEffect(() => {
    const setValues = () => {
      const nodes = QuestionnaireSchema._nodes;
      nodes.forEach((node) => {
        const value = responseMap[node];
        setValue(node, value);
      });
    };
    setValues();
  }, []);

  return (
    <>
      {isLoading ? <LoadingScreen opacity={"80%"} /> : null}
      <Container maxWidth={"xl"}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="h4" sx={{ mb: 4 }}>
              Risk Exposure Assessment Questionnaire
            </Typography>
          </Grid>
        </Grid>

        <NumberStepper steps={steps} activeStep={activeStep} handleStep={handleStep} completed={completed} />

        <FormProvider methods={methods} onSubmit={handleSubmit(onSubmit)}>
          {progressBar}

          <>
            <QuestionnaireContext.Provider value={{ responseMap, setResponseMap, handleResponseChange }}>
              <Questionnaire list={[...groupedQuestions[activeStep].questions]} />
            </QuestionnaireContext.Provider>

            {!!errors.afterSubmit && <Alert severity="error">{errors.afterSubmit.message}</Alert>}

            <Box sx={{ display: "flex", flexDirection: "row", pt: 2 }}>
              <Button color="inherit" disabled={activeStep === 0} onClick={handleBack} sx={{ mr: 1 }}>
                Back
              </Button>
              <Box sx={{ flex: "1 1 auto" }} />

              {/* check if all steps are completed */}
              {isLastStep() ? (
                <LoadingButton color="inherit" size="large" type="submit" variant="contained" loading={isSubmitting}>
                  Finish
                </LoadingButton>
              ) : (
                <Button onClick={handleNext}>Next</Button>
              )}
            </Box>
          </>
        </FormProvider>
      </Container>
    </>
  );
}

export default RiskAssessmentQuestionnairePage;
