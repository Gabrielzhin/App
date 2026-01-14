import { api } from './api';

export interface QuizQuestion {
  id: number;
  question: string;
  options: {
    letter: string;
    text: string;
  }[];
}

export interface UserQuizAnswer {
  id: string;
  userId: string;
  questionId: number;
  answer: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  quizOwnerId: string;
  answers: Record<string, string>;
  score: number;
  totalQuestions: number;
  completedAt: string;
  user?: {
    id: string;
    username: string;
    name: string;
    profilePicture?: string;
  };
}

export const quizService = {
  // Get all quiz questions
  async getQuestions(): Promise<QuizQuestion[]> {
    try {
      const response = await api.get<{ questions: QuizQuestion[] }>('/api/quiz/questions');
      return response.questions;
    } catch (error) {
      console.error('Error fetching quiz questions:', error);
      throw error;
    }
  },

  // Get current user's answers
  async getMyAnswers(): Promise<UserQuizAnswer[]> {
    try {
      const response = await api.get<{ answers: UserQuizAnswer[] }>('/api/quiz/my-answers');
      return response.answers || [];
    } catch (error) {
      console.error('Error fetching my quiz answers:', error);
      throw error;
    }
  },

  // Save/update user's quiz answers
  async saveMyAnswers(answers: { questionId: number; answer: string }[]): Promise<UserQuizAnswer[]> {
    try {
      const response = await api.post<{ answers: UserQuizAnswer[] }>('/api/quiz/my-answers', {
        answers,
      });
      return response.answers;
    } catch (error) {
      console.error('Error saving quiz answers:', error);
      throw error;
    }
  },

  // Check if a user has completed their quiz
  async checkUserQuizStatus(userId: string): Promise<{ hasCompleted: boolean; answeredQuestions: number }> {
    try {
      const response = await api.get<{ hasCompleted: boolean; answeredQuestions: number }>(
        `/api/quiz/user/${userId}`
      );
      return response;
    } catch (error) {
      console.error('Error checking quiz status:', error);
      throw error;
    }
  },

  // Submit a quiz attempt for a friend's quiz
  async submitQuizAttempt(
    quizOwnerId: string,
    answers: Record<string, string>
  ): Promise<{ attempt: QuizAttempt; score: number; totalQuestions: number; percentage: number }> {
    try {
      const response = await api.post<{
        attempt: QuizAttempt;
        score: number;
        totalQuestions: number;
        percentage: number;
      }>(`/api/quiz/attempt/${quizOwnerId}`, { answers });
      return response;
    } catch (error) {
      console.error('Error submitting quiz attempt:', error);
      throw error;
    }
  },

  // Get all attempts on my quiz (leaderboard)
  async getMyQuizAttempts(): Promise<QuizAttempt[]> {
    try {
      const response = await api.get<{ attempts: QuizAttempt[] }>('/api/quiz/attempts/my-quiz');
      return response.attempts || [];
    } catch (error) {
      console.error('Error fetching quiz attempts:', error);
      throw error;
    }
  },

  // Get my attempt on a friend's quiz
  async getMyAttemptOnFriendQuiz(friendId: string): Promise<QuizAttempt | null> {
    try {
      const response = await api.get<{ attempt: QuizAttempt | null }>(`/api/quiz/attempts/friend/${friendId}`);
      return response.attempt;
    } catch (error) {
      console.error('Error fetching quiz attempt:', error);
      throw error;
    }
  },
};
