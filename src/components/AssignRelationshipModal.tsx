import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  relationshipService,
  RelationshipCategory,
  RelationshipSubcategory,
  RelationshipDetail,
  FriendRelationship,
} from '../services/relationship';

interface AssignRelationshipModalProps {
  visible: boolean;
  friendId: string;
  friendName: string;
  currentRelationships?: FriendRelationship[];
  onClose: () => void;
  onRelationshipAssigned: () => void;
}

export default function AssignRelationshipModal({
  visible,
  friendId,
  friendName,
  currentRelationships = [],
  onClose,
  onRelationshipAssigned,
}: AssignRelationshipModalProps) {
  const [categories, setCategories] = useState<RelationshipCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<RelationshipCategory | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<RelationshipSubcategory | null>(
    null
  );
  const [selectedDetail, setSelectedDetail] = useState<RelationshipDetail | null>(null);
  const [step, setStep] = useState<'category' | 'subcategory' | 'detail' | 'confirm'>('category');

  useEffect(() => {
    if (visible) {
      loadCategories();
      resetSelection();
    }
  }, [visible]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await relationshipService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
      Alert.alert('Error', 'Failed to load relationship categories');
    } finally {
      setLoading(false);
    }
  };

  const resetSelection = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSelectedDetail(null);
    setStep('category');
  };

  const handleSelectCategory = (category: RelationshipCategory) => {
    setSelectedCategory(category);
    setSelectedSubcategory(null);
    setSelectedDetail(null);

    if (category.subcategories && category.subcategories.length > 0) {
      setStep('subcategory');
    } else {
      // No subcategories, assign category only
      setStep('confirm');
    }
  };

  const handleSelectSubcategory = (subcategory: RelationshipSubcategory) => {
    setSelectedSubcategory(subcategory);
    setSelectedDetail(null);

    if (subcategory.details && subcategory.details.length > 0) {
      setStep('detail');
    } else {
      // No details, assign with category + subcategory
      setStep('confirm');
    }
  };

  const handleSelectDetail = (detail: RelationshipDetail) => {
    setSelectedDetail(detail);
    setStep('confirm');
  };

  const handleAssign = async () => {
    try {
      setLoading(true);
      await relationshipService.assignRelationship({
        friendId,
        categoryId: selectedCategory?.id,
        subcategoryId: selectedSubcategory?.id,
        detailId: selectedDetail?.id,
      });
      onRelationshipAssigned();
      onClose();
    } catch (error: any) {
      console.error('Error assigning relationship:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to assign relationship');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRelationship = async (relationshipId: string) => {
    Alert.alert('Remove Relationship', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await relationshipService.removeRelationship(relationshipId);
            onRelationshipAssigned();
          } catch (error) {
            Alert.alert('Error', 'Failed to remove relationship');
          }
        },
      },
    ]);
  };

  const renderStepIndicator = () => {
    const steps = ['Category', 'Subcategory', 'Detail', 'Confirm'];
    const currentStepIndex = steps.indexOf(
      step.charAt(0).toUpperCase() + step.slice(1)
    );

    return (
      <View style={styles.stepIndicator}>
        {steps.slice(0, currentStepIndex + 1).map((stepName, index) => (
          <View key={stepName} style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                index === currentStepIndex && styles.stepCircleActive,
              ]}
            >
              <Text
                style={[
                  styles.stepNumber,
                  index === currentStepIndex && styles.stepNumberActive,
                ]}
              >
                {index + 1}
              </Text>
            </View>
            <Text style={styles.stepLabel}>{stepName}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderCurrentRelationships = () => {
    if (currentRelationships.length === 0) return null;

    return (
      <View style={styles.currentRelationshipsSection}>
        <Text style={styles.sectionTitle}>Current Relationships</Text>
        {currentRelationships.map((rel) => (
          <View key={rel.id} style={styles.relationshipChip}>
            <View style={styles.relationshipInfo}>
              <Text style={styles.relationshipText}>
                {rel.category?.name}
                {rel.subcategory && ` → ${rel.subcategory.name}`}
                {rel.detail && ` → ${rel.detail.name}`}
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleRemoveRelationship(rel.id)}>
              <MaterialCommunityIcons name="close-circle" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text style={styles.title}>Assign Relationship</Text>
          <View style={styles.placeholder} />
        </View>

        <Text style={styles.friendName}>for {friendName}</Text>

        {renderStepIndicator()}
        {renderCurrentRelationships()}

        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />
        ) : (
          <ScrollView style={styles.content}>
            {step === 'category' && (
              <View>
                <Text style={styles.instructionText}>
                  Select how you know {friendName}:
                </Text>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={styles.optionCard}
                    onPress={() => handleSelectCategory(category)}
                  >
                    <Text style={styles.optionTitle}>{category.name}</Text>
                    {category.subcategories && category.subcategories.length > 0 && (
                      <Text style={styles.optionCount}>
                        {category.subcategories.length} subcategories
                      </Text>
                    )}
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {step === 'subcategory' && selectedCategory && (
              <View>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setStep('category')}
                >
                  <MaterialCommunityIcons name="chevron-left" size={20} color="#3b82f6" />
                  <Text style={styles.backText}>Back to Categories</Text>
                </TouchableOpacity>
                <Text style={styles.instructionText}>
                  Select the specific {selectedCategory.name.toLowerCase()}:
                </Text>
                {selectedCategory.subcategories?.map((subcategory) => (
                  <TouchableOpacity
                    key={subcategory.id}
                    style={styles.optionCard}
                    onPress={() => handleSelectSubcategory(subcategory)}
                  >
                    <Text style={styles.optionTitle}>{subcategory.name}</Text>
                    {subcategory.details && subcategory.details.length > 0 && (
                      <Text style={styles.optionCount}>
                        {subcategory.details.length} details
                      </Text>
                    )}
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={() => setStep('confirm')}
                >
                  <Text style={styles.skipText}>
                    Skip - Just use "{selectedCategory.name}"
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'detail' && selectedSubcategory && (
              <View>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setStep('subcategory')}
                >
                  <MaterialCommunityIcons name="chevron-left" size={20} color="#3b82f6" />
                  <Text style={styles.backText}>Back to Subcategories</Text>
                </TouchableOpacity>
                <Text style={styles.instructionText}>
                  Select the detail for {selectedSubcategory.name}:
                </Text>
                {selectedSubcategory.details?.map((detail) => (
                  <TouchableOpacity
                    key={detail.id}
                    style={styles.optionCard}
                    onPress={() => handleSelectDetail(detail)}
                  >
                    <Text style={styles.optionTitle}>{detail.name}</Text>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.skipButton}
                  onPress={() => setStep('confirm')}
                >
                  <Text style={styles.skipText}>
                    Skip - Just use "{selectedCategory?.name} → {selectedSubcategory.name}"
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'confirm' && (
              <View>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    if (selectedDetail) setStep('detail');
                    else if (selectedSubcategory) setStep('subcategory');
                    else setStep('category');
                  }}
                >
                  <MaterialCommunityIcons name="chevron-left" size={20} color="#3b82f6" />
                  <Text style={styles.backText}>Change</Text>
                </TouchableOpacity>
                <Text style={styles.confirmTitle}>Confirm Relationship</Text>
                <View style={styles.confirmCard}>
                  <Text style={styles.confirmLabel}>You'll assign:</Text>
                  <Text style={styles.confirmValue}>
                    {selectedCategory?.name}
                    {selectedSubcategory && ` → ${selectedSubcategory.name}`}
                    {selectedDetail && ` → ${selectedDetail.name}`}
                  </Text>
                  <Text style={styles.confirmLabel}>To:</Text>
                  <Text style={styles.confirmValue}>{friendName}</Text>
                </View>
                <TouchableOpacity style={styles.assignButton} onPress={handleAssign}>
                  <Text style={styles.assignButtonText}>Assign Relationship</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 32,
  },
  friendName: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    padding: 8,
    backgroundColor: '#fff',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  stepItem: {
    alignItems: 'center',
    marginHorizontal: 8,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: '#3b82f6',
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  stepNumberActive: {
    color: '#fff',
  },
  stepLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  currentRelationshipsSection: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  relationshipChip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  relationshipInfo: {
    flex: 1,
  },
  relationshipText: {
    fontSize: 14,
    color: '#1e40af',
    fontWeight: '500',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  instructionText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 16,
    fontWeight: '500',
  },
  optionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },
  optionCount: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 4,
  },
  backText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  skipButton: {
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  skipText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  confirmCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  confirmLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  confirmValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  assignButton: {
    backgroundColor: '#3b82f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  assignButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
