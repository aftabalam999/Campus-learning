import { PhaseService, TopicService } from './dataServices';

export class DataSeedingService {
  static async seedInitialData(): Promise<boolean> {
    try {
      console.log('Starting data seeding...');

      // Get existing phases to check what's already seeded
      const existingPhases = await PhaseService.getAllPhases();
      const existingPhaseNames = existingPhases.map(p => p.name);

      console.log('Existing phases:', existingPhaseNames);

      // Import all phase/topic files
      const phaseFiles = [
        require('../data/initialData'),
        require('../data/phase3Topics'),
        require('../data/phase4Topics'),
        require('../data/phase5Topics'),
        require('../data/phase6Topics'),
        require('../data/phase7Topics')
      ];

      // Seed all phases and topics (skip if already exists)
      for (const phaseFile of phaseFiles) {
        // For initialData, use initialPhases and detailedTopics
        if (phaseFile.initialPhases && phaseFile.detailedTopics) {
          for (const phaseData of phaseFile.initialPhases) {
            let phaseId: string;
            const existingPhase = existingPhases.find(p => p.name === phaseData.name);

            if (existingPhase) {
              console.log(`Phase already exists, checking topics: ${phaseData.name}`);
              phaseId = existingPhase.id;
            } else {
              phaseId = await PhaseService.createPhase({
                ...phaseData,
                created_at: new Date()
              });
              console.log(`Created phase: ${phaseData.name}`);
            }

            const topicsForPhase = phaseFile.detailedTopics[phaseData.name];
            if (topicsForPhase) {
              // Get existing topics to avoid duplicates
              const existingTopics = await TopicService.getTopicsByPhase(phaseId);
              const existingTopicNames = existingTopics.map(t => t.name);

              for (const topicData of topicsForPhase) {
                if (!existingTopicNames.includes(topicData.name)) {
                  await TopicService.createTopic({
                    ...topicData,
                    phase_id: phaseId,
                    created_at: new Date()
                  });
                  console.log(`Created topic: ${topicData.name} for phase: ${phaseData.name}`);
                }
              }
            }
          }
        }
        // For phase3-7 files, use exported array
        const phaseMap = [
          { arr: phaseFile.phase3Topics, name: 'Phase 3: Interactive Quiz Master', order: 4 },
          { arr: phaseFile.phase4Topics, name: 'Phase 4: AI-Powered Content Generator', order: 5 },
          { arr: phaseFile.phase5Topics, name: 'Phase 5: Ask Gemini Web App', order: 6 },
          { arr: phaseFile.phase6Topics, name: 'Phase 6: Student Feedback Manager', order: 7 },
          { arr: phaseFile.phase7Topics, name: 'Phase 7: CollabSphere', order: 8 }
        ];
        for (const { arr, name, order } of phaseMap) {
          if (arr && arr.length > 0) {
            // Check if phase already exists
            if (existingPhaseNames.includes(name)) {
              console.log(`Phase already exists, skipping: ${name}`);
              continue;
            }

            const phaseData = {
              name,
              order: order
            };
            const phaseId = await PhaseService.createPhase(phaseData);
            console.log(`Created phase: ${name}`);
            for (const topicData of arr) {
              await TopicService.createTopic({
                ...topicData,
                phase_id: phaseId
              });
              console.log(`Created topic: ${topicData.name} for phase: ${name}`);
            }
          }
        }
      }

      console.log('Data seeding completed successfully!');
      return true;
    } catch (error) {
      console.error('Error seeding initial data:', error);
      return false;
    }
  }

  static async resetData(): Promise<boolean> {
    try {
      console.log('Resetting data...');

      // Note: In a production environment, you might want more careful deletion
      // This is for development/demo purposes
      console.warn('Data reset functionality should be used carefully in production');

      return true;
    } catch (error) {
      console.error('Error resetting data:', error);
      return false;
    }
  }

  // Helper method to check data status
  static async getDataStatus(): Promise<{
    phasesCount: number;
    topicsCount: number;
    isSeeded: boolean;
  }> {
    try {
      const phases = await PhaseService.getAllPhases();
      let topicsCount = 0;

      for (const phase of phases) {
        const topics = await TopicService.getTopicsByPhase(phase.id);
        topicsCount += topics.length;
      }

      return {
        phasesCount: phases.length,
        topicsCount,
        isSeeded: phases.length > 0
      };
    } catch (error) {
      console.error('Error checking data status:', error);
      return {
        phasesCount: 0,
        topicsCount: 0,
        isSeeded: false
      };
    }
  }

  /**
   * Clean up all existing curriculum data from Firebase
   */
  static async cleanupCurriculumData(): Promise<boolean> {
    try {
      console.log('🧹 Starting curriculum data cleanup...');

      // Get all existing phases
      const existingPhases = await PhaseService.getAllPhases();
      console.log(`Found ${existingPhases.length} phases to clean up`);

      // Delete all topics for each phase
      for (const phase of existingPhases) {
        console.log(`Cleaning up topics for phase: ${phase.name}`);
        const topics = await TopicService.getTopicsByPhase(phase.id);

        for (const topic of topics) {
          await TopicService.deleteTopic(topic.id);
        }
        console.log(`Deleted ${topics.length} topics from ${phase.name}`);
      }

      // Delete all phases
      for (const phase of existingPhases) {
        console.log(`Deleting phase: ${phase.name}`);
        await PhaseService.deletePhase(phase.id);
      }

      console.log('✅ Curriculum data cleanup completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Error during curriculum cleanup:', error);
      throw error;
    }
  }
}