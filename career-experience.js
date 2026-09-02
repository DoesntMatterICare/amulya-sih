/* Shared, selection-aware learning paths for the Luma product surfaces. */
(() => {
    const uiux = {
        key: 'uiux',
        title: 'UI/UX Designer',
        isCustom: false,
        nextMilestone: 'Complete Wireframing'
    };

    const productManager = {
        key: 'product-manager',
        title: 'Product Manager',
        isCustom: true,
        weeks: 8,
        nextMilestone: 'Complete Product Prioritization',
        suggestion: 'Start with a short customer conversation, then turn one repeated pain point into a clear problem statement.',
        summary: 'Your Product Manager path is built around understanding customer problems, making deliberate trade-offs, and learning from measurable outcomes. Keep connecting every roadmap decision to a real user need.',
        why: {
            title: 'Why Product Discovery Matters',
            text: 'Product decisions become stronger when they begin with a validated customer problem instead of a feature idea.',
            skills: ['Customer Discovery', 'Problem Framing', 'Prioritization', 'Roadmapping', 'Product Metrics']
        },
        concepts: [
            { id: 'product-discovery', title: 'Product Discovery', description: 'Identify meaningful customer problems before deciding what to build.', matters: 'Discovery keeps a team focused on evidence, user needs, and the riskiest assumptions behind an opportunity.', skills: ['Interviews', 'Opportunity Mapping', 'Assumptions'], tip: 'Write down the problem in the user’s words before proposing a solution.' },
            { id: 'problem-framing', title: 'Problem Framing', description: 'Turn research signals into a focused, testable problem statement.', matters: 'A well-framed problem aligns the team on who is affected, what is happening, and why the issue matters.', skills: ['Problem Statements', 'Scope', 'Outcomes'], tip: 'Keep the problem separate from your preferred solution.' },
            { id: 'product-prioritization', title: 'Product Prioritization', description: 'Compare opportunities using impact, effort, confidence, and strategic fit.', matters: 'Prioritization makes trade-offs visible so teams can invest effort where it can create the most value.', skills: ['RICE', 'Trade-offs', 'Decision Making'], tip: 'Use one repeatable framework, then document the reason for the final decision.' },
            { id: 'roadmap-planning', title: 'Roadmap Planning', description: 'Communicate the sequence of outcomes, bets, and learning goals.', matters: 'A roadmap is a shared direction, not a promise of every feature on a fixed date.', skills: ['Outcomes', 'Sequencing', 'Stakeholder Communication'], tip: 'Describe the customer outcome each roadmap item is meant to improve.' },
            { id: 'product-experiments', title: 'Product Experiments', description: 'Test assumptions with lightweight prototypes, pilots, and clear success measures.', matters: 'Experiments reduce uncertainty before a team commits significant delivery effort.', skills: ['Hypotheses', 'Prototypes', 'Success Metrics'], tip: 'Define what would change your mind before launching the experiment.' },
            { id: 'product-metrics', title: 'Product Metrics', description: 'Choose behavioural measures that show whether the product is helping people.', matters: 'Useful metrics connect product activity to a user or business outcome rather than vanity numbers.', skills: ['North-star Metrics', 'Funnels', 'Retention'], tip: 'Pair a quantitative signal with customer feedback to understand why it moved.' }
        ],
        resources: [
            { id: 'pm-product-discovery', concept: 'product-discovery', type: 'guide', title: 'Guide: Plan a Customer Discovery Interview', desc: 'Prepare neutral questions that surface real workflows, motivations, and friction.', minutes: 15, tags: ['customer discovery', 'research'] },
            { id: 'pm-problem-framing', concept: 'problem-framing', type: 'read', title: 'Article: Write a Problem Statement That Guides Decisions', desc: 'Translate evidence into a concise statement of the user, need, and impact.', minutes: 18, tags: ['problem framing', 'strategy'] },
            { id: 'pm-prioritization', concept: 'product-prioritization', type: 'guide', title: 'Guide: Prioritize With Impact and Confidence', desc: 'Use a practical comparison method to make trade-offs explainable.', minutes: 17, tags: ['prioritization', 'decision making'] },
            { id: 'pm-roadmap', concept: 'roadmap-planning', type: 'read', title: 'Article: Build an Outcome-Based Roadmap', desc: 'Plan the sequence of learning and delivery without treating a roadmap as a feature list.', minutes: 20, tags: ['roadmapping', 'outcomes'] },
            { id: 'pm-experiment', concept: 'product-experiments', type: 'challenge', title: 'Challenge: Design a Product Experiment', desc: 'Write one hypothesis, a lightweight test, and the measure that will determine the next step.', minutes: 16, tags: ['experiments', 'validation'] },
            { id: 'pm-metrics', concept: 'product-metrics', type: 'guide', title: 'Guide: Select Meaningful Product Metrics', desc: 'Choose metrics that describe value delivered, not just activity recorded.', minutes: 19, tags: ['metrics', 'analysis'] }
        ],
        weeklyPlan: [
            { title: 'Customer Discovery Basics', concept: 'product-discovery', minutes: 30 },
            { title: 'Frame a Customer Problem', concept: 'problem-framing', minutes: 35 },
            { title: 'Prioritize an Opportunity', concept: 'product-prioritization', minutes: 30 },
            { title: 'Draft an Outcome Roadmap', concept: 'roadmap-planning', minutes: 40 },
            { title: 'Plan a Product Experiment', concept: 'product-experiments', minutes: 35 },
            { title: 'Review Product Metrics', concept: 'product-metrics', minutes: 25 },
            { title: 'Weekly Product Reflection', concept: null, minutes: 15 }
        ],
        milestones: ['Start Product Discovery', 'Frame a Customer Problem', 'Prioritize the Opportunity', 'Create an Outcome Roadmap', 'Run a Product Experiment', 'Review Product Metrics', 'Share a Product Decision', 'Complete the Product Manager Foundations'],
        challenge: { id: 'local-product-manager-challenge', title: 'Write a One-Page Product Brief', description: 'Pick a customer problem, state the desired outcome, and explain the first experiment you would run.', difficulty: 'Beginner', duration_minutes: 30 }
    };

    const machineLearning = {
        key: 'machine-learning',
        title: 'Machine Learning Engineer',
        isCustom: true,
        weeks: 12,
        nextMilestone: 'Complete Supervised Learning Foundations',
        suggestion: 'Build one small notebook end to end: inspect the data, make a baseline, and explain the result in plain language.',
        summary: 'Your Machine Learning path combines Python, data preparation, modelling, and evaluation. Focus on building small reproducible experiments and explaining what the model can, and cannot, tell you.',
        why: {
            title: 'Why Data Foundations Matter',
            text: 'Reliable models begin with carefully understood data, clear evaluation rules, and transparent assumptions.',
            skills: ['Python', 'Data Preparation', 'Model Evaluation', 'Experiment Design', 'Deployment Basics']
        },
        concepts: [
            { id: 'python-data-foundations', title: 'Python and Data Foundations', description: 'Use Python notebooks and tabular data to inspect a real problem.', matters: 'Python and data literacy make it possible to turn a question into a reproducible analysis and model experiment.', skills: ['Python', 'Notebooks', 'Pandas'], tip: 'Start by inspecting the shape, types, and missing values before modelling anything.' },
            { id: 'data-preparation', title: 'Data Preparation', description: 'Clean, transform, and document data so a model can learn from it responsibly.', matters: 'Preparation prevents a model from learning accidental patterns caused by missing values, leakage, or inconsistent inputs.', skills: ['Cleaning', 'Features', 'Data Quality'], tip: 'Keep a simple record of every transformation you apply to the data.' },
            { id: 'supervised-learning', title: 'Supervised Learning', description: 'Train a baseline classifier or regressor with labelled examples.', matters: 'Supervised learning connects known examples to a prediction task and gives you a clear baseline for improvement.', skills: ['Regression', 'Classification', 'Baselines'], tip: 'A simple baseline is valuable because it gives every later model a fair comparison.' },
            { id: 'model-evaluation', title: 'Model Evaluation', description: 'Measure performance with appropriate validation and error analysis.', matters: 'Evaluation shows whether a model generalizes beyond the examples it has already seen.', skills: ['Validation', 'Metrics', 'Error Analysis'], tip: 'Choose the metric based on the cost of being wrong, not on convenience.' },
            { id: 'neural-networks', title: 'Neural Network Basics', description: 'Understand layers, training loops, and the trade-offs of more complex models.', matters: 'Neural networks are useful tools, but only after a problem, data set, and baseline are clear.', skills: ['Training Loops', 'Overfitting', 'Embeddings'], tip: 'Increase model complexity only when the data and evaluation evidence justify it.' },
            { id: 'model-deployment', title: 'Model Deployment Basics', description: 'Package a model with inputs, monitoring, and a feedback loop for real use.', matters: 'A useful model needs stable inputs, observable behaviour, and a plan for what happens when conditions change.', skills: ['APIs', 'Monitoring', 'Iteration'], tip: 'Define the expected input and fallback behaviour before integrating the model into a product.' }
        ],
        resources: [
            { id: 'ml-python-foundations', concept: 'python-data-foundations', type: 'guide', title: 'Guide: Explore Data in a Python Notebook', desc: 'Use a small notebook to inspect columns, distributions, and missing values.', minutes: 18, tags: ['python', 'data'] },
            { id: 'ml-data-preparation', concept: 'data-preparation', type: 'read', title: 'Article: Prepare Data Without Leakage', desc: 'Separate training and evaluation decisions so the model is assessed honestly.', minutes: 20, tags: ['data preparation', 'quality'] },
            { id: 'ml-supervised-learning', concept: 'supervised-learning', type: 'guide', title: 'Guide: Train a Baseline Model', desc: 'Create a simple classifier or regressor before testing more advanced approaches.', minutes: 24, tags: ['supervised learning', 'baseline'] },
            { id: 'ml-model-evaluation', concept: 'model-evaluation', type: 'read', title: 'Article: Evaluate Models With the Right Metric', desc: 'Compare validation results and inspect errors to understand model behaviour.', minutes: 18, tags: ['evaluation', 'metrics'] },
            { id: 'ml-neural-networks', concept: 'neural-networks', type: 'guide', title: 'Guide: Neural Network Training Essentials', desc: 'Learn how training, validation, and overfitting affect a neural network.', minutes: 26, tags: ['neural networks', 'training'] },
            { id: 'ml-model-deployment', concept: 'model-deployment', type: 'challenge', title: 'Challenge: Define a Model Serving Plan', desc: 'Describe the model input, output, monitoring signal, and safe fallback for one use case.', minutes: 22, tags: ['deployment', 'monitoring'] }
        ],
        weeklyPlan: [
            { title: 'Python Notebook Foundations', concept: 'python-data-foundations', minutes: 35 },
            { title: 'Prepare a Training Dataset', concept: 'data-preparation', minutes: 40 },
            { title: 'Train a Baseline Model', concept: 'supervised-learning', minutes: 45 },
            { title: 'Evaluate Model Errors', concept: 'model-evaluation', minutes: 35 },
            { title: 'Study Neural Network Basics', concept: 'neural-networks', minutes: 45 },
            { title: 'Plan Model Deployment', concept: 'model-deployment', minutes: 35 },
            { title: 'Weekly Experiment Reflection', concept: null, minutes: 15 }
        ],
        milestones: ['Set Up a Python Workspace', 'Prepare a Training Dataset', 'Train a Baseline Model', 'Evaluate Model Errors', 'Build a Neural Network Prototype', 'Plan Model Deployment', 'Document an Experiment', 'Complete Machine Learning Foundations'],
        challenge: { id: 'local-machine-learning-challenge', title: 'Create a Baseline Model Notebook', description: 'Choose a labelled data set, train one simple baseline, and explain the metric you used to evaluate it.', difficulty: 'Intermediate', duration_minutes: 45 }
    };

    const paths = { uiux, 'product-manager': productManager, 'machine-learning': machineLearning };

    const normalize = (value = '') => {
        const name = String(value).trim().toLowerCase();
        if (name.includes('product')) return 'product-manager';
        if (name.includes('machine learning') || name.includes('artificial intelligence') || name.includes('ai engineering') || name === 'ai') return 'machine-learning';
        return 'uiux';
    };

    const readProgress = () => {
        try {
            const state = JSON.parse(localStorage.getItem('luma_progress_state') || '{}');
            return { completedResourceIds: Array.isArray(state.completedResourceIds) ? state.completedResourceIds : [] };
        } catch (error) {
            return { completedResourceIds: [] };
        }
    };

    const getActive = () => paths[normalize(localStorage.getItem('luma_career_path'))] || uiux;

    const buildSnapshot = () => {
        const career = getActive();
        if (!career.isCustom) return null;
        const completedIds = new Set(readProgress().completedResourceIds);
        const resources = career.resources.map((resource) => ({ ...resource, completed: completedIds.has(resource.id) }));
        const completedConceptIds = career.concepts
            .filter((concept) => {
                const conceptResources = resources.filter((resource) => resource.concept === concept.id);
                return conceptResources.length && conceptResources.every((resource) => resource.completed);
            })
            .map((concept) => concept.id);
        const completedDays = completedConceptIds.length;
        const roadmapDays = career.weeklyPlan.map((day, index) => ({
            day_number: index + 1,
            title: day.title,
            concept: day.concept,
            status: index < completedDays ? 'completed' : 'pending'
        }));
        const completedResources = resources.filter((resource) => resource.completed).length;
        const progressPercent = resources.length ? Math.round((completedResources / (resources.length + 2)) * 100) : 0;
        return {
            profile: { active_career_name: career.title },
            resources,
            roadmap: { career_name: career.title, roadmap_days: roadmapDays },
            completedDays,
            completedResources,
            progressPercent,
            challenge: career.challenge,
            challengeComplete: false,
            projects: []
        };
    };

    const getConcept = (conceptId = '') => {
        const career = getActive();
        if (!career.isCustom) return null;
        const concept = career.concepts.find((item) => item.id === conceptId);
        if (!concept) return null;
        const resources = career.resources
            .filter((item) => item.concept === conceptId)
            .map((item) => ({ ...item, dur: `${item.minutes} mins` }));
        return {
            ...concept,
            resources,
            theory: {
                title: `Understanding ${concept.title}`,
                introduction: concept.description,
                mindset: concept.matters,
                phaseTitle: 'A practical learning sequence',
                phases: [
                    { title: 'Set the question', text: `Define the decision or outcome that ${concept.title.toLowerCase()} should improve.` },
                    { title: 'Work with evidence', text: 'Use examples, observations, or data rather than relying on an untested assumption.' },
                    { title: 'Try a focused approach', text: 'Make the smallest practical attempt, then review what happened.' },
                    { title: 'Explain the learning', text: 'Document the decision, result, and next step so the work can be improved or repeated.' }
                ]
            }
        };
    };

    window.LumaCareerExperience = {
        getActive,
        getActiveKey: () => getActive().key,
        getLocalLibrary: () => getActive().isCustom ? getActive().resources : null,
        getConcept,
        buildSnapshot,
        normalize
    };
})();
