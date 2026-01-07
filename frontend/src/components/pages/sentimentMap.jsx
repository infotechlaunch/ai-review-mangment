import React from 'react'

// Sample sentiment data
const sentimentData = [
  { category: "Customer service", sentiment: 85, position: { x: 20, y: 35 } },
  { category: "Competence", sentiment: 75, position: { x: 45, y: 25 } },
  { category: "Prices", sentiment: 65, position: { x: 70, y: 25 } },
  { category: "Sales", sentiment: 55, position: { x: 88, y: 25 } },
  { category: "Personnel", sentiment: 70, position: { x: 45, y: 60 } },
  { category: "Speed", sentiment: 45, position: { x: 70, y: 60 } },
  { category: "Friendliness", sentiment: 80, position: { x: 88, y: 60 } }
];

// Function to determine color based on sentiment score
const getSentimentColor = (sentiment) => {
  if (sentiment >= 70) return 'bg-green-100 border-2 border-green-300';
  if (sentiment >= 50) return 'bg-yellow-100 border-2 border-yellow-300';
  return 'bg-orange-100 border-2 border-orange-300';
};

export default function SentimentMap() {
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-7xl mx-auto">
        {/* Sentiment Map Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Sentiment Analysis</h2>
          
          {/* Heat Map Container */}
          <div className="relative w-full h-96 rounded-lg overflow-hidden mb-4">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-green-300 via-yellow-200 to-orange-300"></div>
            
            {/* Sentiment Items */}
            {sentimentData.map((item, index) => (
              <div
                key={index}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${item.position.x}%`,
                  top: `${item.position.y}%`
                }}
              >
                <div className={`${getSentimentColor(item.sentiment)} px-10 py-6 rounded-full shadow-lg hover:scale-110 transition cursor-pointer  `}>
                  <span className="text-lg font-semibold text-gray-800 whitespace-nowrap">
                    {item.category}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-600">Category Sentiment</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Negative</span>
              <div className="flex items-center space-x-1">
                <div className="w-32 h-2 bg-gradient-to-r from-red-400 via-yellow-300 to-green-400 rounded-full"></div>
              </div>
              <span className="text-sm text-gray-500">Positive</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">0</span>
              <span className="text-sm text-gray-500">100</span>
            </div>
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Highly Positive</p>
              <p className="text-2xl font-bold text-green-600">
                {sentimentData.filter(d => d.sentiment >= 70).length}
              </p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Neutral</p>
              <p className="text-2xl font-bold text-yellow-600">
                {sentimentData.filter(d => d.sentiment >= 50 && d.sentiment < 70).length}
              </p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Needs Attention</p>
              <p className="text-2xl font-bold text-orange-600">
                {sentimentData.filter(d => d.sentiment < 50).length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
