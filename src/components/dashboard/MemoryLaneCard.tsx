import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Memory } from '../../types';

interface MemoryLaneCardProps {
  olderMemories: Memory[];
  onMemoryPress: (memoryId: string) => void;
}

export const MemoryLaneCard: React.FC<MemoryLaneCardProps> = ({
  olderMemories,
  onMemoryPress,
}) => {
  if (olderMemories.length === 0) {
    return null;
  }

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 60) {
      return `${Math.floor(diffDays / 7)} weeks ago`;
    } else if (diffDays < 365) {
      return `${Math.floor(diffDays / 30)} months ago`;
    } else {
      const years = Math.floor(diffDays / 365);
      return years === 1 ? '1 year ago' : `${years} years ago`;
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="camera-retro" size={24} color="#ec4899" />
        <Text style={styles.title}>Memory Lane</Text>
        <Text style={styles.subtitle}>From your past</Text>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.memories}
      >
        {olderMemories.map((memory) => (
          <TouchableOpacity
            key={memory.id}
            style={styles.memory}
            onPress={() => onMemoryPress(memory.id)}
          >
            <View style={styles.memoryContent}>
              <Text style={styles.memoryDate}>{formatDate(memory.createdAt)}</Text>
              {memory.title ? (
                <Text style={styles.memoryTitle} numberOfLines={2}>
                  {memory.title}
                </Text>
              ) : (
                <Text style={styles.memoryText} numberOfLines={3}>
                  {memory.content}
                </Text>
              )}
              {memory.moods && memory.moods.length > 0 && (
                <View style={styles.moodBadge}>
                  <Text style={styles.moodText}>{memory.moods[0]}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
    marginBottom: 12,
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
  memories: {
    paddingVertical: 4,
  },
  memory: {
    width: 200,
    marginRight: 12,
    backgroundColor: '#fdf2f8',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fce7f3',
  },
  memoryContent: {
    flex: 1,
  },
  memoryDate: {
    fontSize: 11,
    color: '#ec4899',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  memoryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  memoryText: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
  moodBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fce7f3',
  },
  moodText: {
    fontSize: 11,
    color: '#ec4899',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
});
