import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface QuickActionsCardProps {
  draftsCount: number;
  onDraftsPress: () => void;
  onNewMemoryPress: () => void;
}

export const QuickActionsCard: React.FC<QuickActionsCardProps> = ({
  draftsCount,
  onDraftsPress,
  onNewMemoryPress,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="lightning-bolt" size={24} color="#f59e0b" />
        <Text style={styles.title}>Quick Actions</Text>
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity style={styles.action} onPress={onNewMemoryPress}>
          <View style={[styles.actionIcon, { backgroundColor: '#dbeafe' }]}>
            <MaterialCommunityIcons name="plus" size={24} color="#3b82f6" />
          </View>
          <Text style={styles.actionLabel}>New Memory</Text>
        </TouchableOpacity>
        
        {draftsCount > 0 && (
          <TouchableOpacity style={styles.action} onPress={onDraftsPress}>
            <View style={[styles.actionIcon, { backgroundColor: '#fef3c7' }]}>
              <MaterialCommunityIcons name="file-document-edit" size={24} color="#f59e0b" />
            </View>
            <Text style={styles.actionLabel}>
              {draftsCount} {draftsCount === 1 ? 'Draft' : 'Drafts'}
            </Text>
          </TouchableOpacity>
        )}
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  action: {
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },
});
