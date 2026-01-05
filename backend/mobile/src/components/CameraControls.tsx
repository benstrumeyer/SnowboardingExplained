import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import tw from 'twrnc';
import { globalCameraManager, CameraPreset } from '../services/globalCameraManager';

interface CameraControlsProps {
  onPresetChange?: (preset: string) => void;
  currentPreset?: string;
}

export function CameraControls({ onPresetChange, currentPreset = 'front' }: CameraControlsProps) {
  const presets: CameraPreset[] = ['top', 'front', 'back', 'left', 'right'];

  const handlePreset = (preset: CameraPreset) => {
    globalCameraManager.setPreset(preset);
    onPresetChange?.(preset);
  };

  const handleReset = () => {
    globalCameraManager.reset();
    onPresetChange?.('front');
  };

  return (
    <View style={tw`bg-[#222] px-4 py-3 mb-4`}>
      <Text style={tw`text-white text-sm font-bold mb-3`}>Camera Presets</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`mb-3`}>
        <View style={tw`flex-row gap-2`}>
          {presets.map((preset) => (
            <TouchableOpacity
              key={preset}
              onPress={() => handlePreset(preset)}
              style={tw`px-3 py-2 rounded ${
                currentPreset === preset ? 'bg-[#4ECDC4]' : 'bg-[#333]'
              }`}
            >
              <Text
                style={tw`text-xs font-semibold ${
                  currentPreset === preset ? 'text-black' : 'text-white'
                }`}
              >
                {preset.charAt(0).toUpperCase() + preset.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
      <TouchableOpacity
        onPress={handleReset}
        style={tw`w-full bg-[#444] py-2 rounded`}
      >
        <Text style={tw`text-white text-xs font-semibold text-center`}>
          Reset Camera
        </Text>
      </TouchableOpacity>
    </View>
  );
}
