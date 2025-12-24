import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  count,
  eq,
  getTableColumns,
  inArray,
  like,
  sql,
} from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DrizzleAsyncProvider } from 'src/drizzle/drizzle.provider';
import * as schema from 'src/drizzle/schema';

type ProductReturnType = schema.Product & { ingredients: schema.Ingredient[] };

function generateCode(groupName: string, productId: number) {
  const nameSplitted = groupName.split(' ');
  if (nameSplitted.length < 3) {
    return groupName.substring(0, 3).toUpperCase() + productId;
  }
  return (
    nameSplitted.reduce((acc, curr) => acc + curr[0], '').toUpperCase() +
    productId
  );
}

@Injectable()
export class ProductRepository {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private db: NodePgDatabase<typeof schema>,
  ) {}

  private table = schema.products;
  private ingredientsTable = schema.ingredients;
  private productGroupTable = schema.productGroups;
  private inventoryTable = schema.inventory;
  private unitTable = schema.units;
  private warehouseTable = schema.warehouses;
  private groupTable = schema.productGroups;

  public async find(where: {
    name?: string;
    id?: number;
  }): Promise<ProductReturnType> {
    const whereQuery = Object.entries(where).map(([key, value]) =>
      eq(this.table[key], value),
    );
    const product = await this.db.query.products.findFirst({
      where: and(...whereQuery),
      with: { group: true, unit: true },
    });
    const ingredients = await this.db.query.ingredients.findMany({
      where: eq(this.ingredientsTable.productId, product.id),
      with: { unit: true, products: true },
    });
    return { ...product, ingredients };
  }
  /**
   * Find all users in the database
   */
  public async findAll(
    filter: {
      name?: string;
      forSale?: boolean;
      returnable?: boolean;
      fractional?: boolean;
      sku?: string;
      units?: Array<string>;
      groups?: Array<string>;
      warehouses?: Array<string>;
      page?: number;
    } = {},
  ) {
    let where = [];
    if (filter.name) {
      where.push(like(this.table.name, `%${filter.name}%`));
    }
    if (filter.forSale) {
      where.push(eq(this.table.forSale, filter.forSale));
    }
    if (filter.returnable) {
      where.push(eq(this.table.returnable, filter.returnable));
    }
    if (filter.fractional) {
      where.push(eq(this.table.fractional, filter.fractional));
    }
    if (filter.sku) {
      where.push(like(this.table.sku, `%${filter.sku}%`));
    }
    if (filter.units) {
      where.push(
        inArray(
          this.table.unitId,
          filter.units.map((unit) => Number(unit)),
        ),
      );
    }
    if (filter.groups) {
      where.push(
        inArray(
          this.table.groupId,
          filter.groups.map((group) => Number(group)),
        ),
      );
    }
    if (filter.page) {
      try {
        const offset = (filter.page - 1) * 10;
        const products = await this.db.query.products.findMany({
          where: and(...where),
          with: { group: true, unit: true },
          limit: 10,
          offset,
        });

        const [{ total }] = await this.db
          .select({ total: count() })
          .from(this.table)
          .where(and(...where));
        const productJoined = await this.db
          .select({
            ...getTableColumns(this.table),
            unit: {
              id: this.unitTable.id,
              name: this.unitTable.name,
            },
            group: {
              id: this.groupTable.id,
              name: this.groupTable.name,
            },
            inventory: sql`
      COALESCE(
        json_agg(
          json_build_object(
            'warehouseId', ${this.inventoryTable.warehouseId},
            'warehouseName', ${this.warehouseTable.name},
            'quantity', ${this.inventoryTable.quantity}
          )
        ) FILTER (WHERE ${this.inventoryTable.warehouseId} IS NOT NULL),
        '[]'
      )
    `.as('posts'),
            totalStock:
              sql<number>`SUM(${this.inventoryTable.quantity})`.mapWith(Number),
          })
          .from(this.table)
          .leftJoin(
            this.inventoryTable,
            eq(this.inventoryTable.productId, this.table.id),
          )
          .leftJoin(this.unitTable, eq(this.unitTable.id, this.table.unitId))
          .leftJoin(this.groupTable, eq(this.groupTable.id, this.table.groupId))
          .leftJoin(
            this.warehouseTable,
            eq(this.warehouseTable.id, this.inventoryTable.warehouseId),
          )
          .groupBy(this.table.id, this.unitTable.id, this.groupTable.id);
        return { data: productJoined, totalCount: total };
      } catch (e) {
        console.log('Error, ', e);
      }
    }
    const products = await this.db.query.products.findMany({
      where: and(...where),
      with: { group: true, unit: true },
    });

    return { data: products };
  }
  public async create(
    product: schema.ProductInsert & {
      ingredients: Omit<schema.IngredientInsert, 'ingredientId'>[];
    },
  ) {
    const [productGroup] = await this.db.select().from(this.productGroupTable);
    const groupName = productGroup.name;
    let productCreated;
    try {
      [productCreated] = await this.db
        .insert(this.table)
        .values({ ...product })
        .returning();

      await this.db
        .update(this.table)
        .set({
          sku: generateCode(groupName, productCreated.id),
          updatedAt: new Date(),
        })
        .where(eq(this.table.id, productCreated.id));
    } catch (e) {
      console.log(e);
    }
    if (product.ingredients.length) {
      await this.db.insert(schema.ingredients).values(
        product.ingredients.map((ing) => ({
          productId: productCreated.id,
          ingredientId: ing.productId,
          quantity: ing.quantity,
          unitId: ing.unitId,
        })),
      );
    }

    return this.find({ id: productCreated.id });
  }
  public async update(
    id: number,
    product: schema.ProductInsert & {
      ingredients: Omit<schema.IngredientInsert, 'ingredientId'>[];
    },
  ) {
    const { ingredients, ...productData } = product;
    const [productUpdated] = await this.db
      .update(this.table)
      .set({ ...productData, updatedAt: new Date() })
      .where(eq(this.table.id, id))
      .returning();

    try {
      const [productGroup] = await this.db
        .select()
        .from(this.productGroupTable)
        .where(eq(this.productGroupTable.id, productUpdated.groupId));
      await this.db
        .update(this.table)
        .set({
          sku: generateCode(productGroup.name, productUpdated.id),
          updatedAt: new Date(),
        })
        .where(eq(this.table.id, productUpdated.id));
    } catch (e) {
      console.log(e);
    }

    await this.db
      .delete(schema.ingredients)
      .where(eq(schema.ingredients.productId, id));

    if (ingredients && ingredients.length) {
      await this.db.insert(schema.ingredients).values(
        ingredients.map((ing) => ({
          productId: productUpdated.id,
          ingredientId: ing.productId,
          quantity: ing.quantity,
          unitId: ing.unitId,
        })),
      );
    }

    return this.find({ id: productUpdated.id });
  }
  async delete(id: number) {
    await this.db
      .delete(schema.ingredients)
      .where(eq(schema.ingredients.productId, id));
    const prod = await this.db
      .delete(schema.products)
      .where(eq(schema.products.id, id));
  }
  async move({
    warehouseId,
    products,
  }: {
    warehouseId: number | string;
    products: { productId: number | string; quantity: number }[];
  }) {
    try {
      await this.db.transaction(async (tx) => {
        const productsToUpsert = products.map((product) => ({
          warehouseId: Number(warehouseId),
          productId: Number(product.productId),
          quantity: Number(product.quantity),
        }));
        await tx
          .insert(this.inventoryTable)
          .values(productsToUpsert)
          .onConflictDoUpdate({
            target: [
              this.inventoryTable.productId,
              this.inventoryTable.warehouseId,
            ],
            set: {
              quantity: sql`excluded.quantity`,
            },
          });
        await tx
          .update(this.table)
          .set({
            updatedAt: sql`now()`,
          })
          .where(
            inArray(
              this.table.id,
              products.map((p) => Number(p.productId)),
            ),
          );
      });
    } catch (e) {
      console.log('Error', e);
    }
  }
}
