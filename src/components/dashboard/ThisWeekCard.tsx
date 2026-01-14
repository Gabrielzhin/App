import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ThisWeekCardProps {
  thisWeek: number;
  thisMonth: number;
  onThisWeekPress: () => void;
  onThisMonthPress: () => void;
}

export const ThisWeekCard: React.FC<ThisWeekCardProps> = ({
  thisWeek,
  thisMonth,
  onThisWeekPress,
  onThisMonthPress,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="calendar-heart" size={24} color="#10b981" />
        <Text style={styles.title}>Your Journey</Text>
      </View>
      
      <View style={styles.stats}>
        <TouchableOpacity style={styles.stat} onPress={onThisWeekPress}>
          <Text style={styles.statNumber}>{thisWeek}</Text>
          <Text style={styles.statLabel}>moments this week</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color="#9ca3af" style={styles.chevron} />
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity style={styles.stat} onPress={onThisMonthPress}>
          <Text style={styles.statNumber}>{thisMonth}</Text>
          <Text style={styles.statLabel}>moments this month</Text>
          <MaterialCommunityIcons name="chevron-right" size={16} color="#9ca3af" style={styles.chevron} />
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
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#10b981',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  chevron: {
    marginTop: 4,
  },
  divider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
  },
});
