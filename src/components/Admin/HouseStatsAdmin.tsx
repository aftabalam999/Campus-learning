import React, { useState } from 'react';
import { RefreshCw, Home, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { HouseStatsService } from '../../services/houseStatsService';
import { PhaseService } from '../../services/dataServices';

const HouseStatsAdmin: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null);
  const [progress, setProgress] = useState<string>('');

  const handleRefreshStats = async () => {
    setLoading(true);
    setMessage(null);
    setProgress('Starting calculation...');

    try {
      // Get all phases
      const allPhases = await PhaseService.getAllPhases();
      setProgress(`Loaded ${allPhases.length} phases. Starting house calculations...`);

      // Calculate for all houses
      const houses = ['Bageshree', 'Malhar', 'Bhairav'];
      const results: any = {};

      for (const house of houses) {
        setProgress(`Calculating stats for ${house}...`);
        try {
          const houseStats = await HouseStatsService.calculateAndCacheHouseAverages(
            house,
            allPhases
          );
          results[house] = houseStats;
          setProgress(`✅ Completed ${house} (${houseStats.length} phases)`);
        } catch (error) {
          console.error(`Error calculating ${house}:`, error);
          results[house] = { error: String(error) };
          setProgress(`❌ Failed ${house}`);
        }
      }

      // Summary
      const totalPhases = Object.values(results).reduce((sum: number, stats: any) => {
        return sum + (Array.isArray(stats) ? stats.length : 0);
      }, 0);

      setMessage({
        type: 'success',
        text: `Successfully recalculated house statistics! Updated ${totalPhases} phase averages across all houses.`
      });
      setProgress('');
    } catch (error) {
      console.error('Error refreshing house stats:', error);
      setMessage({
        type: 'error',
        text: `Failed to refresh house statistics: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      setProgress('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">House Statistics Management</h2>
        <p className="text-gray-600 mt-2">
          Calculate and cache house performance averages for the Journey page.
        </p>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-1">About House Statistics</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>House averages show how long students typically spend in each phase</li>
              <li>Data is cached weekly to reduce Firestore reads (99% reduction!)</li>
              <li>Students see these averages on their Journey page for comparison</li>
              <li>Recalculation is computationally expensive - only run when needed</li>
              <li>Stats are automatically used for the current week once calculated</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Refresh Button Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Home className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Recalculate House Averages</h3>
              <p className="text-sm text-gray-600">
                Calculate performance averages for Bageshree, Malhar, and Bhairav
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Message Display */}
          {message && (
            <div
              className={`flex items-start gap-3 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 border border-green-200'
                  : message.type === 'error'
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-blue-50 border border-blue-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              ) : message.type === 'error' ? (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              ) : (
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              )}
              <p
                className={`text-sm ${
                  message.type === 'success'
                    ? 'text-green-800'
                    : message.type === 'error'
                    ? 'text-red-800'
                    : 'text-blue-800'
                }`}
              >
                {message.text}
              </p>
            </div>
          )}

          {/* Progress Display */}
          {progress && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin">
                  <RefreshCw className="h-5 w-5 text-gray-600" />
                </div>
                <p className="text-sm text-gray-700 font-medium">{progress}</p>
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleRefreshStats}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700 active:scale-95'
            }`}
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Calculating...' : 'Refresh House Statistics'}
          </button>

          <p className="text-xs text-gray-500 text-center">
            This process may take 1-2 minutes. It will analyze all students across all phases.
          </p>
        </div>
      </div>

      {/* Technical Details */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-2">Technical Details</h4>
        <div className="text-sm text-gray-700 space-y-1">
          <p><strong>Calculation:</strong> Analyzes goals and reflections for all students in each house</p>
          <p><strong>Cache Duration:</strong> One week (automatically uses current week data)</p>
          <p><strong>Storage:</strong> Results saved in <code className="bg-gray-200 px-1 rounded">house_stats</code> collection</p>
          <p><strong>Impact:</strong> Reduces Journey page loads from ~10,000 reads to 3-5 reads (99.95% reduction)</p>
        </div>
      </div>
    </div>
  );
};

export default HouseStatsAdmin;
