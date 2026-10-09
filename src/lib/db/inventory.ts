/**
 * Dépôt de données pour le module Inventaire (Boutique, Buvette, Bibliothèque)
 * Avec adaptateur de repli en mémoire pour tests isolés et CI
 * Auteur : Sergey CHUKHNO
 */

import { getDbPool } from "./client";
import { InventoryCategory, InventoryItemRecord, InventoryLogRecord } from "./schema";

const memoryInventory: InventoryItemRecord[] = [
  {
    id: 1,
    name: "T-shirt officiel Marseille-Échecs",
    category: "BOUTIQUE",
    stockQuantity: 25,
    unitPrice: 15.0,
    alertThreshold: 5,
    description: "T-shirt respirant floqué logo officiel du club",
    lastRestockedAt: new Date(),
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 2,
    name: "Pendule électronique DGT 2010",
    category: "BOUTIQUE",
    stockQuantity: 8,
    unitPrice: 45.0,
    alertThreshold: 3,
    description: "Pendule officielle homologuée FIDE",
    lastRestockedAt: new Date(),
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 3,
    name: "Café expresso Illy",
    category: "BUVETTE",
    stockQuantity: 100,
    unitPrice: 1.0,
    alertThreshold: 20,
    description: "Capsule café pour buvette des tournois",
    lastRestockedAt: new Date(),
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 4,
    name: "Bouteille Eau Minérale 50cl",
    category: "BUVETTE",
    stockQuantity: 4, // ⚠️ En alerte de réassort (4 <= 12)
    unitPrice: 1.0,
    alertThreshold: 12,
    description: "Pack eau fraîche 50cl",
    lastRestockedAt: new Date(),
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 5,
    name: "Mon Système - Aaron Nimzowitsch",
    category: "BIBLIOTHEQUE",
    stockQuantity: 2,
    unitPrice: 22.0,
    alertThreshold: 1,
    description: "Livre classique de stratégie échiquéenne",
    lastRestockedAt: new Date(),
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];
let nextInventoryId = 6;
const memoryLogs: InventoryLogRecord[] = [];
let nextLogId = 1;

export async function getAllInventoryItems(): Promise<InventoryItemRecord[]> {
  const pool = getDbPool();
  if (!pool) return [...memoryInventory];

  const res = await pool.query(
    `SELECT id, name, category, stock_quantity, unit_price, alert_threshold, description, last_restocked_at, updated_by, created_at, updated_at
     FROM inventory_items
     ORDER BY category ASC, name ASC;`
  );

  return res.rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category as InventoryCategory,
    stockQuantity: Number(r.stock_quantity),
    unitPrice: Number(r.unit_price),
    alertThreshold: Number(r.alert_threshold),
    description: r.description,
    lastRestockedAt: r.last_restocked_at,
    updatedBy: r.updated_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function getInventoryItemById(id: number): Promise<InventoryItemRecord | null> {
  const pool = getDbPool();
  if (!pool) {
    return memoryInventory.find((i) => i.id === id) || null;
  }

  const res = await pool.query(
    `SELECT id, name, category, stock_quantity, unit_price, alert_threshold, description, last_restocked_at, updated_by, created_at, updated_at
     FROM inventory_items
     WHERE id = $1;`,
    [id]
  );

  if (res.rows.length === 0) return null;

  const r = res.rows[0];
  return {
    id: r.id,
    name: r.name,
    category: r.category as InventoryCategory,
    stockQuantity: Number(r.stock_quantity),
    unitPrice: Number(r.unit_price),
    alertThreshold: Number(r.alert_threshold),
    description: r.description,
    lastRestockedAt: r.last_restocked_at,
    updatedBy: r.updated_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function createInventoryItem(data: {
  name: string;
  category: InventoryCategory;
  stockQuantity: number;
  unitPrice: number;
  alertThreshold?: number;
  description?: string | null;
  updatedBy?: string | null;
}): Promise<InventoryItemRecord | null> {
  const pool = getDbPool();
  if (!pool) {
    const item: InventoryItemRecord = {
      id: nextInventoryId++,
      name: data.name,
      category: data.category,
      stockQuantity: data.stockQuantity,
      unitPrice: data.unitPrice,
      alertThreshold: data.alertThreshold !== undefined ? data.alertThreshold : 5,
      description: data.description || null,
      lastRestockedAt: new Date(),
      updatedBy: data.updatedBy || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    memoryInventory.push(item);
    return item;
  }

  const res = await pool.query(
    `INSERT INTO inventory_items (name, category, stock_quantity, unit_price, alert_threshold, description, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name, category, stock_quantity, unit_price, alert_threshold, description, last_restocked_at, updated_by, created_at, updated_at;`,
    [
      data.name,
      data.category,
      data.stockQuantity,
      data.unitPrice,
      data.alertThreshold !== undefined ? data.alertThreshold : 5,
      data.description || null,
      data.updatedBy || null,
    ]
  );

  const r = res.rows[0];
  return {
    id: r.id,
    name: r.name,
    category: r.category as InventoryCategory,
    stockQuantity: Number(r.stock_quantity),
    unitPrice: Number(r.unit_price),
    alertThreshold: Number(r.alert_threshold),
    description: r.description,
    lastRestockedAt: r.last_restocked_at,
    updatedBy: r.updated_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function updateInventoryStock(
  itemId: number,
  changeAmount: number,
  reason: string,
  performedBy?: string | null
): Promise<{ item: InventoryItemRecord | null; isAlert: boolean }> {
  const pool = getDbPool();
  if (!pool) {
    const item = memoryInventory.find((i) => i.id === itemId);
    if (!item) return { item: null, isAlert: false };

    item.stockQuantity = Math.max(0, item.stockQuantity + changeAmount);
    item.updatedAt = new Date();
    if (changeAmount > 0) item.lastRestockedAt = new Date();
    item.updatedBy = performedBy || null;

    memoryLogs.push({
      id: nextLogId++,
      itemId,
      changeAmount,
      reason,
      performedBy: performedBy || null,
      createdAt: new Date(),
    });

    return { item, isAlert: item.stockQuantity <= item.alertThreshold };
  }

  // Mise à jour du stock en base
  const updateRes = await pool.query(
    `UPDATE inventory_items
     SET stock_quantity = GREATEST(0, stock_quantity + $1),
         updated_at = NOW(),
         updated_by = $2,
         last_restocked_at = CASE WHEN $1 > 0 THEN NOW() ELSE last_restocked_at END
     WHERE id = $3
     RETURNING id, name, category, stock_quantity, unit_price, alert_threshold, description, last_restocked_at, updated_by, created_at, updated_at;`,
    [changeAmount, performedBy || null, itemId]
  );

  if (updateRes.rows.length === 0) {
    return { item: null, isAlert: false };
  }

  // Insertion log d'audit
  await pool.query(
    `INSERT INTO inventory_logs (item_id, change_amount, reason, performed_by)
     VALUES ($1, $2, $3, $4);`,
    [itemId, changeAmount, reason, performedBy || null]
  );

  const r = updateRes.rows[0];
  const item: InventoryItemRecord = {
    id: r.id,
    name: r.name,
    category: r.category as InventoryCategory,
    stockQuantity: Number(r.stock_quantity),
    unitPrice: Number(r.unit_price),
    alertThreshold: Number(r.alert_threshold),
    description: r.description,
    lastRestockedAt: r.last_restocked_at,
    updatedBy: r.updated_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };

  const isAlert = item.stockQuantity <= item.alertThreshold;

  return { item, isAlert };
}

export async function getLowStockAlerts(): Promise<InventoryItemRecord[]> {
  const pool = getDbPool();
  if (!pool) {
    return memoryInventory.filter((i) => i.stockQuantity <= i.alertThreshold);
  }

  const res = await pool.query(
    `SELECT id, name, category, stock_quantity, unit_price, alert_threshold, description, last_restocked_at, updated_by, created_at, updated_at
     FROM inventory_items
     WHERE stock_quantity <= alert_threshold
     ORDER BY stock_quantity ASC;`
  );

  return res.rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category as InventoryCategory,
    stockQuantity: Number(r.stock_quantity),
    unitPrice: Number(r.unit_price),
    alertThreshold: Number(r.alert_threshold),
    description: r.description,
    lastRestockedAt: r.last_restocked_at,
    updatedBy: r.updated_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}
