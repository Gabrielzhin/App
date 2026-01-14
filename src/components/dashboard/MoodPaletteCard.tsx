import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { MoodStat } from '../../services/stats';

interface MoodPaletteCardProps {
  topMoods: MoodStat[];
  onMoodPress: (mood: string) => void;
}

const MOOD_COLORS: Record<string, string> = {
  joy: '#f59e0b',
  gratitude: '#10b981',
  peace: '#3b82f6',
  love: '#ec4899',
  hope: '#8b5cf6',
  nostalgia: '#6366f1',
  bittersweet: '#f97316',
  melancholy: '#6b7280',
  wonder: '#14b8a6',
  contentment: '#84cc16',
};

export const MoodPaletteCard: React.FC<MoodPaletteCardProps> = ({
  topMoods,
  onMoodPress,
}) => {
  if (topMoods.length === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="palette" size={24} color="#8b5cf6" />
        <Text style={styles.title}>Mood Palette</Text>
        <Text style={styles.subtitle}>Your most felt emotions</Text>
      </View>
      
      <View style={styles.moods}>
        {topMoods.map((moodStat, index) => {
          // Extract base mood name (remove emoji if present)
          const baseMood = moodStat.mood.toLowerCase().split(' ')[0].replace(/[^\w]/g, '');
          const color = MOOD_COLORS[baseMood] || '#6b7280';
          return (
            <TouchableOpacity
              key={moodStat.mood}
              style={styles.mood}
              onPress={() => onMoodPress(moodStat.mood)}
            >
              <View style={[styles.moodCircle, { backgroundColor: color }]}>
                <Text style={styles.moodEmoji}>
                  {baseMood === 'joy' && '😊'}
                  {baseMood === 'gratitude' && '🙏'}
                  {baseMood === 'peace' && '☮️'}
                  {baseMood === 'love' && '❤️'}
                  {baseMood === 'hope' && '🌟'}
                  {baseMood === 'nostalgia' && '🕰️'}
                  {baseMood === 'bittersweet' && '🍂'}
                  {baseMood === 'melancholy' && '🌧️'}
                  {baseMood === 'wonder' && '✨'}
                  {baseMood === 'contentment' && '😌'}
                  {baseMood === 'happy' && '😊'}
                  {baseMood === 'peaceful' && '🕊️'}
                  {baseMood === 'calm' && '😌'}
                </Text>
              </View>
              <Text style={styles.moodLabel}>{moodStat.mood}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginLeft: 'auto',
    fontStyle: 'italic',
  },
  moods: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  mood: {
    alignItems: 'center',
  },
  moodCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  moodEmoji: {
    fontSize: 28,
  },
  moodLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
});
