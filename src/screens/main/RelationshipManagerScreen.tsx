import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  relationshipService,
  RelationshipCategory,
  RelationshipSubcategory,
  RelationshipDetail,
} from '../../services/relationship';

export default function RelationshipManagerScreen() {
  const [categories, setCategories] = useState<RelationshipCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedSubcategory, setExpandedSubcategory] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await relationshipService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      Alert.alert('Error', 'Failed to load relationships');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = () => {
    Alert.prompt(
      'New Category',
      'Enter category name (e.g., Work, School, Family):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async (name) => {
            if (!name || !name.trim()) return;
            try {
              await relationshipService.createCategory(name.trim());
              loadCategories();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to create category');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleAddSubcategory = (categoryId: string) => {
    Alert.prompt(
      'New Subcategory',
      'Enter subcategory name (e.g., Company name, School name):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async (name) => {
            if (!name || !name.trim()) return;
            try {
              await relationshipService.createSubcategory(categoryId, name.trim());
              loadCategories();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to create subcategory');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleAddDetail = (subcategoryId: string) => {
    Alert.prompt(
      'New Detail',
      'Enter detail name (e.g., Department, Team):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async (name) => {
            if (!name || !name.trim()) return;
            try {
              await relationshipService.createDetail(subcategoryId, name.trim());
              loadCategories();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to create detail');
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handleDeleteCategory = (category: RelationshipCategory) => {
    const count = category._count?.relationships || 0;
    if (count > 0) {
      Alert.alert(
        'Cannot Delete',
        `This category is assigned to ${count} friend${count > 1 ? 's' : ''}. Remove those relationships first.`
      );
      return;
    }

    if (category.isDefault) {
      Alert.alert('Cannot Delete', 'Default categories cannot be deleted.');
      return;
    }

    Alert.alert(
      'Delete Category',
      `Delete "${category.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await relationshipService.deleteCategory(category.id);
              loadCategories();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete category');
            }
          },
        },
      ]
    );
  };

  const handleDeleteSubcategory = (subcategory: RelationshipSubcategory) => {
    const count = subcategory._count?.relationships || 0;
    if (count > 0) {
      Alert.alert(
        'Cannot Delete',
        `This subcategory is assigned to ${count} friend${count > 1 ? 's' : ''}. Remove those relationships first.`
      );
      return;
    }

    Alert.alert(
      'Delete Subcategory',
      `Delete "${subcategory.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await relationshipService.deleteSubcategory(subcategory.id);
              loadCategories();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete subcategory');
            }
          },
        },
      ]
    );
  };

  const handleDeleteDetail = (detail: RelationshipDetail) => {
    const count = detail._count?.relationships || 0;
    if (count > 0) {
      Alert.alert(
        'Cannot Delete',
        `This detail is assigned to ${count} friend${count > 1 ? 's' : ''}. Remove those relationships first.`
      );
      return;
    }

    Alert.alert(
      'Delete Detail',
      `Delete "${detail.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await relationshipService.deleteDetail(detail.id);
              loadCategories();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete detail');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Relationships</Text>
        <Text style={styles.subtitle}>
          Organize how you know your friends
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {categories.map((category) => (
          <View key={category.id} style={styles.categoryCard}>
            <TouchableOpacity
              style={styles.categoryHeader}
              onPress={() =>
                setExpandedCategory(expandedCategory === category.id ? null : category.id)
              }
            >
              <View style={styles.categoryTitleRow}>
                <MaterialCommunityIcons
                  name={expandedCategory === category.id ? 'chevron-down' : 'chevron-right'}
                  size={24}
                  color="#6b7280"
                />
                <Text style={styles.categoryName}>{category.name}</Text>
                {category._count && category._count.relationships > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{category._count.relationships}</Text>
                  </View>
                )}
              </View>
              <View style={styles.categoryActions}>
                <TouchableOpacity
                  onPress={() => handleAddSubcategory(category.id)}
                  style={styles.iconButton}
                >
                  <MaterialCommunityIcons name="plus" size={20} color="#3b82f6" />
                </TouchableOpacity>
                {!category.isDefault && (
                  <TouchableOpacity
                    onPress={() => handleDeleteCategory(category)}
                    style={styles.iconButton}
                  >
                    <MaterialCommunityIcons name="delete-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>

            {expandedCategory === category.id && category.subcategories && (
              <View style={styles.subcategoriesContainer}>
                {category.subcategories.map((subcategory) => (
                  <View key={subcategory.id} style={styles.subcategoryCard}>
                    <TouchableOpacity
                      style={styles.subcategoryHeader}
                      onPress={() =>
                        setExpandedSubcategory(
                          expandedSubcategory === subcategory.id ? null : subcategory.id
                        )
                      }
                    >
                      <View style={styles.subcategoryTitleRow}>
                        <MaterialCommunityIcons
                          name={
                            expandedSubcategory === subcategory.id
                              ? 'chevron-down'
                              : 'chevron-right'
                          }
                          size={20}
                          color="#9ca3af"
                        />
                        <Text style={styles.subcategoryName}>{subcategory.name}</Text>
                        {subcategory._count && subcategory._count.relationships > 0 && (
                          <View style={styles.countBadgeSmall}>
                            <Text style={styles.countTextSmall}>
                              {subcategory._count.relationships}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.subcategoryActions}>
                        <TouchableOpacity
                          onPress={() => handleAddDetail(subcategory.id)}
                          style={styles.iconButton}
                        >
                          <MaterialCommunityIcons name="plus" size={18} color="#3b82f6" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeleteSubcategory(subcategory)}
                          style={styles.iconButton}
                        >
                          <MaterialCommunityIcons name="delete-outline" size={18} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>

                    {expandedSubcategory === subcategory.id && subcategory.details && (
                      <View style={styles.detailsContainer}>
                        {subcategory.details.map((detail) => (
                          <View key={detail.id} style={styles.detailRow}>
                            <Text style={styles.detailName}>{detail.name}</Text>
                            <View style={styles.detailActions}>
                              {detail._count && detail._count.relationships > 0 && (
                                <View style={styles.countBadgeTiny}>
                                  <Text style={styles.countTextTiny}>
                                    {detail._count.relationships}
                                  </Text>
                                </View>
                              )}
                              <TouchableOpacity
                                onPress={() => handleDeleteDetail(detail)}
                                style={styles.iconButton}
                              >
                                <MaterialCommunityIcons name="delete-outline" size={16} color="#ef4444" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                        {subcategory.details.length === 0 && (
                          <Text style={styles.emptyText}>No details yet</Text>
                        )}
                      </View>
                    )}
                  </View>
                ))}
                {category.subcategories.length === 0 && (
                  <Text style={styles.emptyText}>No subcategories yet</Text>
                )}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={handleAddCategory}>
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  categoryName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  categoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
  countBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
  },
  subcategoriesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  subcategoryCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  subcategoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  subcategoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  subcategoryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
  },
  subcategoryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  countBadgeSmall: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countTextSmall: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4f46e5',
  },
  detailsContainer: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 6,
    marginBottom: 4,
  },
  detailName: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  detailActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadgeTiny: {
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  countTextTiny: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7c3aed',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    padding: 12,
    fontStyle: 'italic',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});
