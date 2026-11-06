import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Job } from './job.entity';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepository: Repository<Job>,
    @InjectQueue('jobs')
    private readonly jobsQueue: Queue,
  ) {}

  async create(message: string): Promise<{ id: string; status: string }> {
    // 1. Insert row with status 'queued'
    const job = this.jobRepository.create({
      message,
      status: 'queued',
      result: null,
    });
    const savedJob = await this.jobRepository.save(job);

    // 2. Add job to BullMQ queue
    await this.jobsQueue.add('process-job', { jobId: savedJob.id });

    return {
      id: savedJob.id,
      status: savedJob.status,
    };
  }

  async findOne(id: string): Promise<Job> {
    const job = await this.jobRepository.findOne({ where: { id } });
    if (!job) {
      throw new NotFoundException(`Job with ID ${id} not found`);
    }
    return job;
  }

  async findRecent(limit = 10): Promise<Job[]> {
    return this.jobRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}

