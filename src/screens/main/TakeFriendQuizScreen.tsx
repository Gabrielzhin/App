import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { quizService, QuizQuestion } from '../../services/quiz';
import { api } from '../../services/api';

export default function TakeFriendQuizScreen({ route, navigation }: any) {
  const { userId, userName } = route.params;
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    loadQuizData();
  }, []);

  const loadQuizData = async () => {
    try {
      setLoading(true);

      // Check if user has completed their quiz
      const status = await quizService.checkUserQuizStatus(userId);
      if (!status.hasCompleted) {
        Alert.alert('Quiz Not Available', `${userName} hasn't completed their quiz yet.`, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }

      // Check if current user has already taken this quiz
      const previousAttempt = await quizService.getMyAttemptOnFriendQuiz(userId);
      if (previousAttempt) {
        setPreviousScore(previousAttempt.score);
        setQuizCompleted(true);
      }

      // Load questions
      const questionsData = await quizService.getQuestions();
      setQuestions(questionsData);

      // Get user info
      try {
        const userResponse = await api.get(`/api/users/${userId}`);
        setUserInfo(userResponse);
      } catch (error) {
        console.log('Could not load user info');
      }
    } catch (error) {
      console.error('Error loading quiz:', error);
      Alert.alert('Error', 'Failed to load quiz');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionId: number, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleSubmit = async () => {
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < questions.length) {
      Alert.alert(
        'Incomplete Quiz',
        `You've only answered ${answeredCount} out of ${questions.length} questions. Submit anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Submit', onPress: () => submitQuiz() },
        ]
      );
      return;
    }

    submitQuiz();
  };

  const submitQuiz = async () => {
    try {
      setSubmitting(true);

      // Convert answers to string keys for API
      const answersForAPI: Record<string, string> = {};
      Object.entries(answers).forEach(([questionId, answer]) => {
        answersForAPI[questionId] = answer;
      });

      const result = await quizService.submitQuizAttempt(userId, answersForAPI);

      Alert.alert(
        'Quiz Complete!',
        `You scored ${result.score} out of ${result.totalQuestions} (${result.percentage}%)`,
        [
          {
            text: 'OK',
            onPress: () => {
              setQuizCompleted(true);
              setPreviousScore(result.score);
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error submitting quiz:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{userName}'s Quiz</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </SafeAreaView>
    );
  }

  if (quizCompleted && previousScore !== null) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{userName}'s Quiz</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.completedContainer}>
          <MaterialCommunityIcons name="trophy" size={80} color="#f59e0b" />
          <Text style={styles.completedTitle}>Quiz Completed!</Text>
          <Text style={styles.completedScore}>
            Your Score: {previousScore}/10
          </Text>
          <Text style={styles.completedPercentage}>
            {Math.round((previousScore / 10) * 100)}%
          </Text>
          <Text style={styles.completedMessage}>
            {previousScore >= 8
              ? "🎉 Amazing! You know them really well!"
              : previousScore >= 6
              ? "👍 Good job! You know them pretty well."
              : previousScore >= 4
              ? "😊 Not bad! You're getting to know them."
              : "💪 Keep spending time together to learn more!"}
          </Text>
          <TouchableOpacity style={styles.doneButton} onPress={() => navigation.goBack()}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const isComplete = answeredCount === questions.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{userName}'s Quiz</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {userInfo && (
          <View style={styles.userCard}>
            {userInfo.profilePicture ? (
              <Image source={{ uri: userInfo.profilePicture }} style={styles.userAvatar} />
            ) : (
              <View style={styles.userAvatarPlaceholder}>
                <MaterialCommunityIcons name="account" size={32} color="#9ca3af" />
              </View>
            )}
            <Text style={styles.userCardText}>How well do you know {userName}?</Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <MaterialCommunityIcons name="lightbulb-on-outline" size={24} color="#f59e0b" />
          <Text style={styles.infoText}>
            Guess how {userName} answered each question. The more you get right, the higher your score!
          </Text>
        </View>

        <View style={styles.progressCard}>
          <Text style={styles.progressText}>
            Progress: {answeredCount}/{questions.length}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(answeredCount / questions.length) * 100}%` },
              ]}
            />
          </View>
        </View>

        {questions.map((question, index) => (
          <View key={question.id} style={styles.questionCard}>
            <Text style={styles.questionNumber}>Question {index + 1}</Text>
            <Text style={styles.questionText}>{question.question}</Text>

            {question.options.map(option => {
              const isSelected = answers[question.id] === option.letter;
              return (
                <TouchableOpacity
                  key={option.letter}
                  style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                  onPress={() => handleAnswerSelect(question.id, option.letter)}
                >
                  <View style={[styles.optionRadio, isSelected && styles.optionRadioSelected]}>
                    {isSelected && <View style={styles.optionRadioInner} />}
                  </View>
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {option.letter}. {option.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.submitContainer}>
        <TouchableOpacity
          style={[styles.submitButton, !isComplete && styles.submitButtonPartial]}
          onPress={handleSubmit}
          disabled={submitting || answeredCount === 0}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <MaterialCommunityIcons name="check-circle" size={20} color="white" />
              <Text style={styles.submitButtonText}>
                {isComplete ? 'Submit Quiz' : `Submit (${answeredCount}/${questions.length})`}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    gap: 12,
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  userAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userCardText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#fffbeb',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
  },
  progressCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 4,
  },
  questionCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  questionNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#f59e0b',
    marginBottom: 8,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
    lineHeight: 22,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  optionButtonSelected: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionRadioSelected: {
    borderColor: '#f59e0b',
  },
  optionRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#f59e0b',
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  optionTextSelected: {
    color: '#1f2937',
    fontWeight: '500',
  },
  submitContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: '#10b981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonPartial: {
    backgroundColor: '#f59e0b',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  completedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  completedTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 24,
    marginBottom: 16,
  },
  completedScore: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  completedPercentage: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 16,
  },
  completedMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  doneButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
  },
  doneButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
