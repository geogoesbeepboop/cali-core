import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

@Entity('economic_data')
@Index(['seriesId', 'date'], { unique: true })
export class EconomicData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  seriesId: string;

  @Column('varchar', { length: 255, nullable: true })
  title: string;

  @Column('date')
  date: Date;

  @Column('decimal', { precision: 15, scale: 6, nullable: true })
  value: number;

  @Column('varchar', { length: 50, nullable: true })
  frequency: string;

  @Column('varchar', { length: 50, nullable: true })
  units: string;

  @Column('timestamp', { nullable: true })
  lastUpdated: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}