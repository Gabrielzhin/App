import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface MemoryLibraryCardProps {
  coreMemories: number;
  collections: number;
  totalMemories: number;
  onCoreMemoriesPress: () => void;
  onCollectionsPress: () => void;
  onTotalMemoriesPress: () => void;
}

export const MemoryLibraryCard: React.FC<MemoryLibraryCardProps> = ({
  coreMemories,
  collections,
  totalMemories,
  onCoreMemoriesPress,
  onCollectionsPress,
  onTotalMemoriesPress,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="bookshelf" size={24} color="#6366f1" />
        <Text style={styles.title}>Memory Library</Text>
      </View>
      
      <View style={styles.stats}>
        <TouchableOpacity style={styles.stat} onPress={onCoreMemoriesPress}>
          <MaterialCommunityIcons name="star" size={20} color="#f59e0b" />
          <Text style={styles.statNumber}>{coreMemories}</Text>
          <Text style={styles.statLabel}>Core</Text>
          {coreMemories > 0 && <MaterialCommunityIcons name="chevron-right" size={16} color="#9ca3af" style={{ marginTop: 4 }} />}
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity style={styles.stat} onPress={onCollectionsPress}>
          <MaterialCommunityIcons name="folder-multiple" size={20} color="#8b5cf6" />
          <Text style={styles.statNumber}>{collections}</Text>
          <Text style={styles.statLabel}>Collections</Text>
          {collections > 0 && <MaterialCommunityIcons name="chevron-right" size={16} color="#9ca3af" style={{ marginTop: 4 }} />}
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity style={styles.stat} onPress={onTotalMemoriesPress}>
          <MaterialCommunityIcons name="book-open-variant" size={20} color="#6366f1" />
          <Text style={styles.statNumber}>{totalMemories}</Text>
          <Text style={styles.statLabel}>Total</Text>
          {totalMemories > 0 && <MaterialCommunityIcons name="chevron-right" size={16} color="#9ca3af" style={{ marginTop: 4 }} />}
        </TouchableOpacity>
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
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#e5e7eb',
  },
});
