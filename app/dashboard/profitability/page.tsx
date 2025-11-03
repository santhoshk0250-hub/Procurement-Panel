'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Hotel, Users, Moon, TrendingUp, Save } from 'lucide-react';
import axios from "axios";

// Types
interface Room {
  room_id: string;
  room_type: string;
  room_size?: string;
  occupancy_min: number;
  occupancy_max: number;
  smoking_policy?: string;
  pricing?: {
    currency: string;
    rate_plans: Array<{
      plan_name: string;
      price: number;
      cancellation_policy: string;
    }>;
  };
}

interface HotelData {
  _id: string;
  hotel_id: string;
  property_name: string;
  star_category: string;
  rooms: Room[];
  location: {
    city: string;
    state: string;
    country: string;
  };
}

interface RoomCategory {
  name: string;
  rooms: string[];
  hotelInfo?: {
    hotelName: string;
    city: string;
  };
}

interface HotelCategory {
  name: string;
  roomCategories: RoomCategory[];
}

interface RoomValues {
  rooms: number[];
  nights: number[];
  surge: number[];
}

interface ProfitabilityRoomSetting {
  category: string;
  roomType: string;
  rooms: number[];
  nights: number[];
  surge: number[];
  _id?: string;
}

interface ProfitabilityData {
  _id: string;
  roomSettings: ProfitabilityRoomSetting[];
  createdAt: string;
  updatedAt: string;
  __v: number;
}

type SectionType = 'rooms' | 'nights' | 'surge';

const sections: SectionType[] = ['rooms', 'nights', 'surge'];
const sectionLabels: string[] = [
  'Number of Rooms',
  'Number of Nights', 
  'Surge Rate'
];
const sectionIcons = [Users, Moon, TrendingUp];
const subLabels: string[] = [
  '1 room',
  '2 rooms', 
  '3 rooms',
  '3+ rooms'
];

export default function ProfitabilityPage() {
  const [selectedHotelCategory, setSelectedHotelCategory] = useState<number>(0);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [roomValues, setRoomValues] = useState<Record<string, RoomValues>>({});
  const [hotels, setHotels] = useState<HotelData[]>([]);
  const [hotelCategories, setHotelCategories] = useState<HotelCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [profitability, setProfitability] = useState<ProfitabilityData | null>(null);

  // Organize hotels by category
  const organizeHotelsByCategory = (hotelData: HotelData[]): HotelCategory[] => {
    const categoryMap = new Map<string, HotelCategory>();
    
    hotelData.forEach(hotel => {
      const starCategory = hotel.star_category;
      let categoryName = '';
      
      switch(starCategory.toLowerCase()) {
        case 'hostel':
          categoryName = 'Hostel';
          break;
        case '1':
        case '2':
          categoryName = 'Budget';
          break;
        case '3':
          categoryName = '3-Star';
          break;
        case '4':
          categoryName = '4-Star';
          break;
        case '5':
          categoryName = '5-Star';
          break;
        default:
          categoryName = 'Other';
      }
      
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, {
          name: categoryName,
          roomCategories: []
        });
      }
      
      const category = categoryMap.get(categoryName)!;
      const roomTypeMap = new Map<string, string[]>();
      
      hotel.rooms.forEach(room => {
        const roomType = room.room_type || 'Standard Room';
        if (!roomTypeMap.has(roomType)) {
          roomTypeMap.set(roomType, []);
        }
        roomTypeMap.get(roomType)!.push(`${hotel.property_name} - ${room.room_id}`);
      });
      
      roomTypeMap.forEach((roomIds, roomType) => {
        const existingRoomCategory = category.roomCategories.find(rc => rc.name === roomType);
        if (existingRoomCategory) {
          existingRoomCategory.rooms.push(...roomIds);
        } else {
          category.roomCategories.push({
            name: roomType,
            rooms: roomIds,
            hotelInfo: {
              hotelName: hotel.property_name,
              city: hotel.location.city
            }
          });
        }
      });
    });
    
    return Array.from(categoryMap.values()).sort((a, b) => {
      const order = ['Hostel', 'Budget', '3-Star', '4-Star', '5-Star', 'Other'];
      return order.indexOf(a.name) - order.indexOf(b.name);
    });
  };

  // Function to populate room values from profitability data
  const populateRoomValuesFromProfitability = (
    profitabilityData: ProfitabilityData,
    categories: HotelCategory[]
  ): Record<string, RoomValues> => {
    const newRoomValues: Record<string, RoomValues> = {};
    
    // Create a map of profitability settings for quick lookup
    const profitabilityMap = new Map<string, ProfitabilityRoomSetting>();
    profitabilityData.roomSettings.forEach(setting => {
      const key = `${setting.category}:${setting.roomType}`;
      profitabilityMap.set(key, setting);
    });
    
    // Iterate through all categories and room types to populate values
    categories.forEach(category => {
      category.roomCategories.forEach(roomCategory => {
        // Generate the same key format used in your component
        const hotelName = roomCategory.hotelInfo?.hotelName || "Unknown Hotel";
        const key = `${category.name}:${hotelName}:${roomCategory.name}`;
        
        // Look for matching profitability data
        const profitabilityKey = `${category.name}:${roomCategory.name}`;
        const profitabilitySetting = profitabilityMap.get(profitabilityKey);
        
        if (profitabilitySetting) {
          // Populate with saved values
          newRoomValues[key] = {
            rooms: [...profitabilitySetting.rooms],
            nights: [...profitabilitySetting.nights],
            surge: [...profitabilitySetting.surge],
          };
        } else {
          // Initialize with default values
          newRoomValues[key] = {
            rooms: [0, 0, 0, 0],
            nights: [0, 0, 0, 0],
            surge: [0, 0, 0, 0],
          };
        }
      });
    });
    
    return newRoomValues;
  };

  // Fetch hotels
  const fetchHotels = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE}hotels/fetchallhotel`);
      const hotelData = response.data.data;
      setHotels(hotelData);
      const organizedCategories = organizeHotelsByCategory(hotelData);
      setHotelCategories(organizedCategories);
      return organizedCategories;
    } catch (error) {
      console.error("Error fetching hotels:", error);
      return [];
    }
  };

  const fetchProfitability = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_BASE}profitability/fetch`);
      const profitabilityData = response.data.data;
      setProfitability(profitabilityData);
      return profitabilityData;
    } catch (error) {
      console.error("Error fetching profitability:", error);
      return null;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch both hotels and profitability data
        const [organizedCategories, profitabilityData] = await Promise.all([
          fetchHotels(),
          fetchProfitability()
        ]);
        
        // If we have both data sets, populate the room values
        if (organizedCategories.length > 0 && profitabilityData) {
          const populatedValues = populateRoomValuesFromProfitability(profitabilityData, organizedCategories);
          setRoomValues(populatedValues);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Expand/collapse room category
  const handleExpand = (categoryName: string, hotelName: string, roomType: string): void => {
    const key = `${categoryName}:${hotelName}:${roomType}`;
    setExpandedRoom(expandedRoom === key ? null : key);

    // Initialize with default values if not already present
    if (!roomValues[key]) {
      setRoomValues((prev) => ({
        ...prev,
        [key]: {
          rooms: [0, 0, 0, 0],
          nights: [0, 0, 0, 0],
          surge: [0, 0, 0, 0],
        },
      }));
    }
  };

  // Handle change in inputs
  const handleChange = (
    key: string,
    type: SectionType,
    index: number,
    value: string
  ): void => {
    const num = parseFloat(value) || 0;
    setRoomValues((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [type]: prev[key][type].map((v, i) => (i === index ? num : v)),
      },
    }));
  };

  const handleSaveChanges = (key: string): void => {
    console.log(`Saving changes for ${key}:`, roomValues[key]);
  };

  const handleReset = (key: string): void => {
    setRoomValues((prev) => ({
      ...prev,
      [key]: {
        rooms: [0, 0, 0, 0],
        nights: [0, 0, 0, 0],
        surge: [0, 0, 0, 0],
      },
    }));
  };

  const handleUpdateAll = async (): Promise<void> => {
    try {
      const payload = {
        roomSettings: roomValues,   // ✅ matches schema
      };

      console.log("Sending room settings:", payload);

      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE}profitability/add`,
        payload
      );

      if (res.data.success) {
        console.log("Saved successfully:", res.data.data);
        alert("Room settings updated successfully!");
      } else {
        console.error("Save failed:", res.data.error);
        alert("Failed to save room settings!");
      }
    } catch (err: any) {
      console.error("Error saving settings:", err.message);
      alert("Something went wrong!");
    }
  };

  const getTotalValues = () => {
    let totalRooms = 0;
    let totalNights = 0;
    let totalSurge = 0;
    
    Object.values(roomValues).forEach(values => {
      totalRooms += values.rooms.reduce((sum, val) => sum + val, 0);
      totalNights += values.nights.reduce((sum, val) => sum + val, 0);
      totalSurge += values.surge.reduce((sum, val) => sum + val, 0);
    });
    
    return { totalRooms, totalNights, totalSurge };
  };

  const { totalRooms, totalNights, totalSurge } = getTotalValues();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading hotels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col lg:flex-row min-h-screen">
        <div className="flex-1 lg:pr-80">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-white shadow-sm border-b">
            <div className="px-4 py-4">
              <div className="flex items-center gap-3 mb-4">
                <Hotel className="w-6 h-6 text-blue-600" />
                <h1 className="text-xl font-bold text-gray-900 truncate">Hotel Profitability Dashboard</h1>
              </div>
              
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 hide-scrollbar">
                {hotelCategories.map((category, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedHotelCategory(index);
                      setExpandedRoom(null);
                    }}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-colors whitespace-nowrap ${
                      selectedHotelCategory === index
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category.name} ({category.roomCategories.length})
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 pb-20 lg:pb-4">
            {hotelCategories.length > 0 && hotelCategories[selectedHotelCategory] && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {hotelCategories[selectedHotelCategory].name} Properties
                </h2>
                
                {hotelCategories[selectedHotelCategory].roomCategories.map((roomCategory, roomIndex) => {
                  const categoryName = hotelCategories[selectedHotelCategory].name;
                  const hotelName = roomCategory.hotelInfo?.hotelName || "Unknown Hotel";
                  const roomType = roomCategory.name;
                  const key = `${categoryName}:${hotelName}:${roomType}`;

                  return (
                    <div key={roomIndex} className="bg-white rounded-lg shadow-sm border">
                      <button
                        onClick={() => handleExpand(categoryName, hotelName, roomType)}
                        className="w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-left">
                            <h3 className="font-medium text-gray-900">{roomType}</h3>
                            <p className="text-sm text-gray-500">{roomCategory.rooms.length} rooms available</p>
                          </div>
                        </div>
                        {expandedRoom === key ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </button>

                      {expandedRoom === key && (
                        <div className="px-4 pb-4 border-t bg-gray-50">
                          <div className="space-y-4 pt-4">
                            {sections.map((section, sectionIndex) => {
                              const IconComponent = sectionIcons[sectionIndex];
                              return (
                                <div key={section} className="bg-white p-4 rounded-lg">
                                  <div className="flex items-center gap-2 mb-3">
                                    <IconComponent className="w-4 h-4 text-blue-600" />
                                    <h4 className="font-medium text-gray-900">{sectionLabels[sectionIndex]}</h4>
                                  </div>
                                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    {subLabels.map((label, index) => (
                                      <div key={index} className="space-y-1">
                                        <label className="text-xs text-gray-600 block">{label}</label>
                                        <input
                                          type="number"
                                          min="0"
                                          step="0.1"
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                          value={roomValues[key]?.[section]?.[index] || ''}
                                          onChange={(e) => 
                                            handleChange(key, section, index, e.target.value)
                                          }
                                          placeholder="0"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                            
                            {/* <div className="flex flex-col sm:flex-row gap-2">
                              <button
                                onClick={() => handleSaveChanges(key)}
                                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                              >
                                <Save className="w-4 h-4" />
                                Save Changes
                              </button>
                              <button
                                onClick={() => handleReset(key)}
                                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                Reset
                              </button>
                            </div> */}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Mobile update all */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
          <button 
            onClick={handleUpdateAll}
            className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            type="button"
          >
            Update All Room Settings
          </button>
        </div>

        {/* Desktop summary */}
        <div className="hidden lg:block fixed right-0 w-80 bg-white border-l shadow-lg overflow-y-auto">
          <div className="p-6">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Save className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">Settings Summary</h2>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Total Rooms</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-700">{totalRooms}</div>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Moon className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-900">Total Nights</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-700">{totalNights}</div>
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-900">Total Surge</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-700">{totalSurge}</div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleUpdateAll}
                className="w-full py-3 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center justify-center gap-2"
                type="button"
              >
                <Save className="w-4 h-4" />
                Update All Room Settings
              </button>
              
              <button 
                onClick={() => setRoomValues({})}
                className="w-full py-2.5 px-4 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 active:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                type="button"
              >
                Clear All Values
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}