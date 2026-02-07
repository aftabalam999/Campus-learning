
import {
    GoalService,
    ReflectionService,
    PhaseService,
    TopicService
} from './dataServices';
import { UserService } from './firestore';
import { User, DailyGoal, DailyReflection } from '../types';

// Dummy Data Configuration
const DUMMY_MENTORS = [
    {
        name: 'Rahul Mentor',
        email: 'rahul.mentor@navgurukul.org',
        role: 'mentor',
        campus: 'Dharamshala',
        house: 'Bageshree'
    },
    {
        name: 'Priya Mentor',
        email: 'priya.mentor@navgurukul.org',
        role: 'mentor',
        campus: 'Dharamshala',
        house: 'Malhar'
    }
];

// Helper to generate dummy students
const HOUSES = ['Bageshree', 'Malhar', 'Bhairav', 'Yaman', 'Kafi'];
const NAMES = [
    'Amit', 'Neha', 'Rohan', 'Sneha', 'Vikram', 'Anjali', 'Deepak', 'Pooja', 'Rahul', 'Kavita',
    'Arjun', 'Meera', 'Sanjay', 'Divya', 'Karan', 'Nisha', 'Raj', 'Simran', 'Varun', 'Aisha',
    'Aditya', 'Riya', 'Sameer', 'Tanvi', 'Vivek'
];

const DUMMY_STUDENTS = NAMES.map((name, index) => ({
    name: `${name} Student`,
    email: `${name.toLowerCase()}.student@navgurukul.org`,
    campus: 'Dharamshala',
    house: HOUSES[index % HOUSES.length]
}));

const SAMPLE_GOALS = [
    "Complete React Tutorial Part 1",
    "Solve 5 DSA problems on Arrays",
    "Design the login page UI",
    "Refactor the backend API",
    "Learn about Firestore Security Rules"
];

const SAMPLE_REFLECTIONS = {
    workedWell: "I was able to focus for 2 hours straight.",
    howAchieved: "By turning off notifications and using the Pomodoro technique.",
    keyLearning: "Understanding how useEffect dependency array works.",
    challenges: "Struggled with solving the 3rd DSA problem."
};

export class UserSeedingService {
    static async seedUsersAndData(): Promise<boolean> {
        try {
            console.log('🌱 Starting user and data seeding...');

            // 1. Get Phases and Topics for data generation
            const phases = await PhaseService.getAllPhases();
            if (phases.length === 0) {
                console.warn('⚠️ No phases found. Please run data seeding first.');
                return false;
            }

            const randomPhase = phases[0]; // Assuming at least one phase exists
            const topics = await TopicService.getTopicsByPhase(randomPhase.id);

            if (topics.length === 0) {
                console.warn('⚠️ No topics found for the first phase.');
                return false;
            }

            // 2. Create Mentors
            const createdMentors: User[] = [];
            for (const mentorData of DUMMY_MENTORS) {
                let mentor = await UserService.getUserByEmail(mentorData.email);
                if (!mentor) {
                    const id = await UserService.createUser({
                        name: mentorData.name,
                        email: mentorData.email,
                        role: mentorData.role as any,
                        campus: mentorData.campus as any,
                        house: mentorData.house as any,
                        created_at: new Date(),
                        updated_at: new Date(),
                        isMentor: true,
                        isAdmin: false
                    });
                    mentor = await UserService.getUserById(id);
                    console.log(`✅ Created mentor: ${mentorData.name}`);
                } else {
                    console.log(`ℹ️ Mentor already exists: ${mentorData.name}`);
                }
                if (mentor) createdMentors.push(mentor);
            }

            // 3. Create Students and Assign Mentors
            for (let i = 0; i < DUMMY_STUDENTS.length; i++) {
                const studentData = DUMMY_STUDENTS[i];
                let student = await UserService.getUserByEmail(studentData.email);
                const assignedMentor = createdMentors[i % createdMentors.length];

                if (!student) {
                    const id = await UserService.createUser({
                        name: studentData.name,
                        email: studentData.email,
                        campus: studentData.campus as any,
                        house: studentData.house as any,
                        mentor_id: assignedMentor.id,
                        current_phase_id: randomPhase.id,
                        current_phase_name: randomPhase.name,
                        created_at: new Date(),
                        updated_at: new Date(),
                        isAdmin: false
                    });
                    student = await UserService.getUserById(id);
                    console.log(`✅ Created student: ${studentData.name} (Assigned to: ${assignedMentor.name})`);
                } else {
                    // Ensure they have a mentor and phase assigned for the data seeding to work well
                    if (!student.mentor_id) {
                        await UserService.updateUser(student.id, { mentor_id: assignedMentor.id });
                        console.log(`Updated student ${student.name} with mentor ${assignedMentor.name}`);
                    }
                    console.log(`ℹ️ Student already exists: ${studentData.name}`);
                }

                if (student) {
                    // 4. Generate Dummy Goals and Reflections for the past 3 days
                    await this.seedStudentActivity(student, randomPhase.id, topics, assignedMentor.id);
                }
            }

            console.log('✨ User and data seeding completed successfully!');
            return true;
        } catch (error) {
            console.error('❌ Error seeding users and data:', error);
            return false;
        }
    }

    private static async seedStudentActivity(
        student: User,
        phaseId: string,
        topics: any[],
        mentorId: string
    ) {
        const today = new Date();

        // Create data for Today, Yesterday, and Day Before Yesterday
        for (let i = 0; i < 3; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);

            // Random Topic
            const topic = topics[Math.floor(Math.random() * topics.length)];
            const goalText = SAMPLE_GOALS[Math.floor(Math.random() * SAMPLE_GOALS.length)];

            // Create Goal
            const created_at = new Date(date);
            created_at.setHours(9, 0, 0, 0); // Morning

            const goalId = await GoalService.createGoal({
                student_id: student.id,
                phase_id: phaseId,
                topic_id: topic.id,
                goal_text: goalText,
                target_percentage: 100,
                status: i === 0 ? 'pending' : 'approved',
                created_at: created_at,
                updated_at: created_at,
                ...(i > 0 ? {
                    reviewed_by: mentorId,
                    reviewed_at: new Date(date.setHours(10, 0, 0, 0)),
                    mentor_comment: "Good goal, keep it up!"
                } : {})
            });

            // Backdate the goal
            await GoalService.updateGoal(goalId, { created_at: created_at });

            // Create Reflection (only for past days)
            if (i > 0) {
                const reflectionTime = new Date(date);
                reflectionTime.setHours(18, 0, 0, 0); // Evening

                // Note: describe properties that are NOT created_at/updated_at
                const reflectionId = await ReflectionService.createReflection({
                    student_id: student.id,
                    goal_id: goalId,
                    phase_id: phaseId,
                    topic_id: topic.id,
                    reflection_answers: SAMPLE_REFLECTIONS,
                    achieved_percentage: 80 + Math.floor(Math.random() * 20),
                    status: 'reviewed',
                    mentor_notes: "Good progress.",
                    mentor_assessment: "on_track",
                    reviewed_by: mentorId,
                    reviewed_at: new Date(date.setHours(19, 0, 0, 0)),
                    feedback_given_at: new Date(date.setHours(19, 0, 0, 0))
                });

                // Backdate the reflection
                await ReflectionService.updateReflection(reflectionId, { created_at: reflectionTime });
            }
        }
    }
}
