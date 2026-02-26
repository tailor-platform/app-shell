import { SyntaxKind, type ObjectLiteralExpression, type Node } from "ts-morph";

// ============================================
// Schema Types
// ============================================

export type SchemaType =
  | "object"
  | "array"
  | "string"
  | "number"
  | "boolean"
  | "any";

export type Schema = {
  type: SchemaType;
  isOptional: boolean;
  properties?: Record<string, Schema>;
  items?: Schema;
};

export type ValidationWarning = {
  file: string;
  message: string;
  key: string;
  validKeys: string[];
};

// ============================================
// Schema Builder DSL
// ============================================

type SchemaBuilder<T extends Schema = Schema> = T & {
  optional: () => SchemaBuilder<T & { isOptional: true }>;
};

function createBuilder<T extends Schema>(schema: T): SchemaBuilder<T> {
  const builder = {
    ...schema,
    optional: () =>
      createBuilder({
        ...schema,
        isOptional: true,
      }),
  } as SchemaBuilder<T>;
  return builder;
}

/**
 * Schema builder namespace providing Zod-like API for defining
 * appShellPageProps validation schemas.
 *
 * @example
 * ```typescript
 * const schema = s.object({
 *   meta: s.object({
 *     title: s.any(),
 *     icon: s.any(),
 *   }).optional(),
 *   guards: s.array(s.any()).optional(),
 *   loader: s.any().optional(),
 * });
 * ```
 */
export const s = {
  /**
   * Define an object schema with specific properties.
   */
  object: (properties: Record<string, SchemaBuilder>): SchemaBuilder => {
    return createBuilder({
      type: "object" as const,
      isOptional: false,
      properties: Object.fromEntries(
        Object.entries(properties).map(([key, value]) => [
          key,
          {
            type: value.type,
            isOptional: value.isOptional,
            properties: value.properties,
            items: value.items,
          },
        ]),
      ),
    });
  },

  /**
   * Define an array schema with item type.
   */
  array: (items: SchemaBuilder): SchemaBuilder => {
    return createBuilder({
      type: "array" as const,
      isOptional: false,
      items: {
        type: items.type,
        isOptional: items.isOptional,
        properties: items.properties,
        items: items.items,
      },
    });
  },

  /**
   * Define a string schema.
   */
  string: (): SchemaBuilder => {
    return createBuilder({
      type: "string" as const,
      isOptional: false,
    });
  },

  /**
   * Define a number schema.
   */
  number: (): SchemaBuilder => {
    return createBuilder({
      type: "number" as const,
      isOptional: false,
    });
  },

  /**
   * Define a boolean schema.
   */
  boolean: (): SchemaBuilder => {
    return createBuilder({
      type: "boolean" as const,
      isOptional: false,
    });
  },

  /**
   * Define an any schema (accepts any value).
   * Use this for complex types like ReactNode, functions, etc.
   */
  any: (): SchemaBuilder => {
    return createBuilder({
      type: "any" as const,
      isOptional: false,
    });
  },
};

// ============================================
// AST Validation
// ============================================

/**
 * Get valid keys from an object schema.
 */
function getValidKeys(schema: Schema): string[] {
  if (schema.type === "object" && schema.properties) {
    return Object.keys(schema.properties);
  }
  return [];
}

/**
 * Validate an ObjectLiteralExpression against a schema.
 */
function validateObjectNode(
  node: ObjectLiteralExpression,
  schema: Schema,
  filePath: string,
  path: string[] = [],
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (schema.type !== "object" || !schema.properties) {
    return warnings;
  }

  const validKeys = getValidKeys(schema);

  for (const prop of node.getProperties()) {
    if (prop.getKind() !== SyntaxKind.PropertyAssignment) continue;

    const propAssignment = prop.asKindOrThrow(SyntaxKind.PropertyAssignment);
    const keyName = propAssignment.getName();

    // Check if key is valid
    if (!validKeys.includes(keyName)) {
      warnings.push({
        file: filePath,
        message: `Unknown key "${keyName}" in ${path.length > 0 ? path.join(".") : "appShellPageProps"}`,
        key: keyName,
        validKeys,
      });
      continue;
    }

    // Recursively validate nested objects
    const propSchema = schema.properties[keyName];
    if (propSchema?.type === "object" && propSchema.properties) {
      const initializer = propAssignment.getInitializer();
      if (
        initializer &&
        initializer.getKind() === SyntaxKind.ObjectLiteralExpression
      ) {
        const nestedObj = initializer as ObjectLiteralExpression;
        warnings.push(
          ...validateObjectNode(nestedObj, propSchema, filePath, [
            ...path,
            keyName,
          ]),
        );
      }
    }
  }

  return warnings;
}

/**
 * Validate appShellPageProps assignment in source code against a schema.
 *
 * @param appShellPagePropsNode - The ObjectLiteralExpression for appShellPageProps
 * @param schema - The schema to validate against
 * @param filePath - The file path for error messages
 * @returns Array of validation warnings
 */
export function validateAppShellPageProps(
  appShellPagePropsNode: ObjectLiteralExpression,
  schema: Schema,
  filePath: string,
): ValidationWarning[] {
  return validateObjectNode(appShellPagePropsNode, schema, filePath);
}

/**
 * Find appShellPageProps assignment in a source file and return the node.
 */
export function findAppShellPagePropsNode(
  sourceFile: Node,
): ObjectLiteralExpression | null {
  const binaryExpressions = sourceFile.getDescendantsOfKind(
    SyntaxKind.BinaryExpression,
  );

  for (const expr of binaryExpressions) {
    const left = expr.getLeft();

    if (left.getKind() !== SyntaxKind.PropertyAccessExpression) continue;

    const propertyAccess = left.asKindOrThrow(
      SyntaxKind.PropertyAccessExpression,
    );
    if (propertyAccess.getName() !== "appShellPageProps") continue;

    const right = expr.getRight();
    if (right.getKind() !== SyntaxKind.ObjectLiteralExpression) continue;

    return right as ObjectLiteralExpression;
  }

  return null;
}
