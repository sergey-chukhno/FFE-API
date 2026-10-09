/**
 * Dépôt de données pour les cours et entraînements (classes)
 * Avec adaptateur de repli en mémoire pour tests isolés et CI
 * Auteur : Sergey CHUKHNO
 */

import { getDbPool } from "./client";
import { ClassRecord } from "./schema";

const memoryClasses: ClassRecord[] = [
  {
    id: 1,
    name: "Poussins Débutants",
    dayOfWeek: "Mercredi",
    startTime: "14:00",
    endTime: "15:30",
    level: "Débutants",
    coachId: "coach-uuid",
    active: true,
    createdAt: new Date(),
  },
  {
    id: 2,
    name: "Perfectionnement Jeunes",
    dayOfWeek: "Samedi",
    startTime: "10:00",
    endTime: "12:00",
    level: "Initiés",
    coachId: "coach-uuid",
    active: true,
    createdAt: new Date(),
  },
];
let nextClassId = 3;

export async function getAllClasses(): Promise<ClassRecord[]> {
  const pool = getDbPool();
  if (!pool) return [...memoryClasses];

  const res = await pool.query(
    `SELECT id, name, day_of_week, start_time, end_time, level, coach_id, active, created_at
     FROM classes
     ORDER BY id ASC;`
  );

  return res.rows.map((r) => ({
    id: r.id,
    name: r.name,
    dayOfWeek: r.day_of_week,
    startTime: r.start_time,
    endTime: r.end_time,
    level: r.level,
    coachId: r.coach_id,
    active: r.active,
    createdAt: r.created_at,
  }));
}

export async function getClassesByCoachId(coachId: string): Promise<ClassRecord[]> {
  const pool = getDbPool();
  if (!pool) {
    return memoryClasses.filter((c) => c.coachId === coachId || coachId === "coach-uuid");
  }

  const res = await pool.query(
    `SELECT id, name, day_of_week, start_time, end_time, level, coach_id, active, created_at
     FROM classes
     WHERE coach_id = $1
     ORDER BY id ASC;`,
    [coachId]
  );

  return res.rows.map((r) => ({
    id: r.id,
    name: r.name,
    dayOfWeek: r.day_of_week,
    startTime: r.start_time,
    endTime: r.end_time,
    level: r.level,
    coachId: r.coach_id,
    active: r.active,
    createdAt: r.created_at,
  }));
}

export async function createClass(data: {
  name: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  level: string;
  coachId?: string | null;
  active?: boolean;
}): Promise<ClassRecord | null> {
  const pool = getDbPool();
  if (!pool) {
    const item: ClassRecord = {
      id: nextClassId++,
      name: data.name,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      level: data.level || "Débutants",
      coachId: data.coachId || null,
      active: data.active !== undefined ? data.active : true,
      createdAt: new Date(),
    };
    memoryClasses.push(item);
    return item;
  }

  const res = await pool.query(
    `INSERT INTO classes (name, day_of_week, start_time, end_time, level, coach_id, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name, day_of_week, start_time, end_time, level, coach_id, active, created_at;`,
    [
      data.name,
      data.dayOfWeek,
      data.startTime,
      data.endTime,
      data.level || "Débutants",
      data.coachId || null,
      data.active !== undefined ? data.active : true,
    ]
  );

  const r = res.rows[0];
  return {
    id: r.id,
    name: r.name,
    dayOfWeek: r.day_of_week,
    startTime: r.start_time,
    endTime: r.end_time,
    level: r.level,
    coachId: r.coach_id,
    active: r.active,
    createdAt: r.created_at,
  };
}
