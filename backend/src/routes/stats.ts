import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { statsService } from '../services/stats.js';

export async function statsRoutes(fastify: FastifyInstance) {
  // GET /api/stats/dashboard - Get comprehensive dashboard stats
  fastify.get(
    '/api/stats/dashboard',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user.id;
        const stats = await statsService.getDashboardStats(userId);
        return reply.send(stats);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return reply.code(500).send({ error: 'Failed to fetch dashboard stats' });
      }
    }
  );

  // GET /api/stats/moods/top - Get top N most-used moods
  fastify.get<{ Querystring: { limit?: string } }>(
    '/api/stats/moods/top',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest<{ Querystring: { limit?: string } }>, reply: FastifyReply) => {
      try {
        const userId = request.user.id;
        const limit = request.query.limit ? parseInt(request.query.limit, 10) : 3;
        
        if (limit < 1 || limit > 10) {
          return reply.code(400).send({ error: 'Limit must be between 1 and 10' });
        }

        const topMoods = await statsService.getTopMoods(userId, limit);
        return reply.send(topMoods);
      } catch (error) {
        console.error('Error fetching top moods:', error);
        return reply.code(500).send({ error: 'Failed to fetch top moods' });
      }
    }
  );

  // GET /api/stats/memories/older - Get older memories for Memory Lane
  fastify.get(
    '/api/stats/memories/older',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user.id;
        const olderMemories = await statsService.getOlderMemories(userId);
        return reply.send(olderMemories);
      } catch (error) {
        console.error('Error fetching older memories:', error);
        return reply.code(500).send({ error: 'Failed to fetch older memories' });
      }
    }
  );

  // GET /api/stats/drafts - Get user's draft memories
  fastify.get(
    '/api/stats/drafts',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user.id;
        const drafts = await statsService.getDrafts(userId);
        return reply.send(drafts);
      } catch (error) {
        console.error('Error fetching drafts:', error);
        return reply.code(500).send({ error: 'Failed to fetch drafts' });
      }
    }
  );
}
