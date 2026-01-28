/**
 * HUBSPOT WORKFLOW NODE EXECUTORS
 *
 * Workflow nodes for HubSpot CRM operations
 * Integrates with WorkflowExecutionEngine
 */

import { Node } from 'reactflow';
import { ExecutionContext, NodeExecutor } from './WorkflowExecutionEngine';
import { HubSpotAdapter, HubSpotContact, HubSpotDeal } from './HubSpotAdapter';
import { hubspotOAuthService } from './HubSpotOAuthService';

// ============================================================
// HELPER: VARIABLE RESOLUTION
// ============================================================

/**
 * Resolve workflow variables from context
 * Example: "trigger_1.output.email" -> context.nodeOutputs.get("trigger_1").output.email
 */
function resolveVariableValue(variablePath: string, context: ExecutionContext): any {
  if (!variablePath || variablePath.trim() === '') {
    return undefined;
  }

  // Split path (e.g., "trigger_1.output.email")
  const parts = variablePath.split('.');

  if (parts.length === 0) {
    return undefined;
  }

  // First part is node ID
  const nodeId = parts[0];

  // Get node output from context
  let value = context.nodeOutputs.get(nodeId);

  if (value === undefined) {
    // Try getting from context.variables as fallback
    value = context.variables[nodeId];
  }

  // Navigate nested path
  for (let i = 1; i < parts.length; i++) {
    if (value === null || value === undefined) {
      return undefined;
    }
    value = value[parts[i]];
  }

  return value;
}

/**
 * Apply transform expression to a value
 * Example: "value.toUpperCase()" or "value * 2"
 */
function applyTransform(value: any, transformExpression: string): any {
  if (!transformExpression || transformExpression.trim() === '') {
    return value;
  }

  try {
    // Create safe function with 'value' parameter
    const func = new Function('value', `return ${transformExpression}`);
    return func(value);
  } catch (error: any) {
    console.error('[TRANSFORM_ERROR]', error.message);
    return value; // Return original value on error
  }
}

// ============================================================
// HUBSPOT - CREATE CONTACT
// ============================================================

interface PropertyMapping {
  hubspotProperty: string;      // HubSpot property name (e.g., "email", "firstname")
  mappedTo: string;              // Workflow variable path (e.g., "trigger_1.output.email")
  transformExpression?: string;  // Optional transform (e.g., "value.toLowerCase()")
}

export class HubSpotCreateContactExecutor implements NodeExecutor {
  async execute(node: Node, context: ExecutionContext, inputs: any): Promise<any> {
    const { propertyMappings } = node.data;

    try {
      const startTime = Date.now();

      // 1. Create HubSpot adapter (handles auth internally)
      const adapter = new HubSpotAdapter(context.userId);

      // 3. Resolve properties from workflow context
      const properties = this.resolveProperties(propertyMappings || [], context);

      // 4. Validate required properties
      if (!properties.email) {
        throw new Error('Email is required to create a contact');
      }

      // 5. Create contact
      const contact = await adapter.createContact({
        properties,
      });

      const durationMs = Date.now() - startTime;

      return {
        success: true,
        action: 'create_contact',
        contact: {
          id: contact.id,
          email: contact.properties.email,
          firstname: contact.properties.firstname,
          lastname: contact.properties.lastname,
          properties: contact.properties,
        },
        durationMs,
        executedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      // Log usage as error
      await hubspotOAuthService.logUsage(
        context.userId,
        'create_contact',
        'error',
        error.message
      );

      throw new Error(`HubSpot Create Contact failed: ${error.message}`);
    }
  }

  /**
   * Resolve properties from workflow context using property mappings
   */
  private resolveProperties(
    mappings: PropertyMapping[],
    context: ExecutionContext
  ): Record<string, any> {
    if (!Array.isArray(mappings)) {
      return {};
    }

    const properties: Record<string, any> = {};

    for (const mapping of mappings) {
      // Get value from workflow context
      let value = resolveVariableValue(mapping.mappedTo, context);

      // Apply transform if provided
      if (mapping.transformExpression) {
        value = applyTransform(value, mapping.transformExpression);
      }

      // Set in properties (only if value is defined)
      if (value !== undefined && value !== null) {
        properties[mapping.hubspotProperty] = value;
      }
    }

    return properties;
  }
}

// ============================================================
// HUBSPOT - UPDATE DEAL
// ============================================================

interface DealPropertyMapping {
  hubspotProperty: string;      // HubSpot deal property (e.g., "dealname", "amount")
  mappedTo: string;              // Workflow variable path (e.g., "trigger_1.output.dealAmount")
  transformExpression?: string;  // Optional transform
}

export class HubSpotUpdateDealExecutor implements NodeExecutor {
  async execute(node: Node, context: ExecutionContext, inputs: any): Promise<any> {
    const { dealId, dealIdSource, propertyMappings } = node.data;

    try {
      const startTime = Date.now();

      // 1. Create HubSpot adapter
      const adapter = new HubSpotAdapter(context.userId);

      // 3. Resolve deal ID from variable or use static value
      let resolvedDealId = dealId;

      if (dealIdSource && dealIdSource !== 'static') {
        resolvedDealId = resolveVariableValue(dealIdSource, context);
      }

      if (!resolvedDealId) {
        throw new Error('Deal ID is required to update a deal');
      }

      // 4. Resolve properties from workflow context
      const properties = this.resolveProperties(propertyMappings || [], context);

      if (Object.keys(properties).length === 0) {
        throw new Error('At least one property must be updated');
      }

      // 5. Update deal
      const deal = await adapter.updateDeal(resolvedDealId, properties);

      const durationMs = Date.now() - startTime;

      return {
        success: true,
        action: 'update_deal',
        deal: {
          id: deal.id,
          dealname: deal.properties.dealname,
          amount: deal.properties.amount,
          dealstage: deal.properties.dealstage,
          closedate: deal.properties.closedate,
          properties: deal.properties,
        },
        durationMs,
        executedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      // Log usage as error
      await hubspotOAuthService.logUsage(
        context.userId,
        'update_deal',
        'error',
        error.message
      );

      throw new Error(`HubSpot Update Deal failed: ${error.message}`);
    }
  }

  /**
   * Resolve properties from workflow context using property mappings
   */
  private resolveProperties(
    mappings: DealPropertyMapping[],
    context: ExecutionContext
  ): Record<string, any> {
    if (!Array.isArray(mappings)) {
      return {};
    }

    const properties: Record<string, any> = {};

    for (const mapping of mappings) {
      // Get value from workflow context
      let value = resolveVariableValue(mapping.mappedTo, context);

      // Apply transform if provided
      if (mapping.transformExpression) {
        value = applyTransform(value, mapping.transformExpression);
      }

      // Set in properties (only if value is defined)
      if (value !== undefined && value !== null) {
        properties[mapping.hubspotProperty] = value;
      }
    }

    return properties;
  }
}

// ============================================================
// HUBSPOT - ADD NOTE
// ============================================================

interface NoteConfig {
  noteContent: string;           // Note content (can contain variable placeholders)
  contactIdSource?: string;      // Workflow variable path for contact ID
  contactId?: string;            // Static contact ID (if not using variable)
}

export class HubSpotAddNoteExecutor implements NodeExecutor {
  async execute(node: Node, context: ExecutionContext, inputs: any): Promise<any> {
    const { noteContent, contactIdSource, contactId } = node.data as NoteConfig;

    try {
      const startTime = Date.now();

      // 1. Create HubSpot adapter
      const adapter = new HubSpotAdapter(context.userId);

      // 3. Resolve contact ID from variable or use static value
      let resolvedContactId = contactId;

      if (contactIdSource) {
        resolvedContactId = resolveVariableValue(contactIdSource, context);
      }

      if (!resolvedContactId) {
        throw new Error('Contact ID is required to add a note');
      }

      // 4. Resolve variables in note content
      const resolvedNoteContent = this.resolveVariablesInContent(noteContent || '', context);

      if (!resolvedNoteContent || resolvedNoteContent.trim() === '') {
        throw new Error('Note content cannot be empty');
      }

      // 5. Add note to contact
      const note = await adapter.addNoteToContact(resolvedContactId, resolvedNoteContent);

      const durationMs = Date.now() - startTime;

      return {
        success: true,
        action: 'add_note',
        note: {
          id: note.id,
          content: resolvedNoteContent,
          contactId: resolvedContactId,
          createdAt: note.createdAt,
        },
        durationMs,
        executedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      // Log usage as error
      await hubspotOAuthService.logUsage(
        context.userId,
        'add_note',
        'error',
        error.message
      );

      throw new Error(`HubSpot Add Note failed: ${error.message}`);
    }
  }

  /**
   * Resolve variables in note content
   * Example: "Contact {{trigger_1.output.name}} has budget {{trigger_1.output.budget}}"
   */
  private resolveVariablesInContent(content: string, context: ExecutionContext): string {
    if (!content) return '';

    // Replace {{variable.path}} with actual values
    return content.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/g, (match, variablePath) => {
      const value = resolveVariableValue(variablePath, context);
      return value !== undefined ? String(value) : match;
    });
  }
}

// ============================================================
// HUBSPOT - SEARCH CONTACTS (Bonus)
// ============================================================

interface SearchFilter {
  property: string;              // HubSpot property to filter (e.g., "email")
  operator: 'EQ' | 'NEQ' | 'LT' | 'GT' | 'CONTAINS' | 'NOT_CONTAINS';
  value: string;                 // Filter value
  valueSource?: string;          // Workflow variable path for dynamic value
}

export class HubSpotSearchContactsExecutor implements NodeExecutor {
  async execute(node: Node, context: ExecutionContext, inputs: any): Promise<any> {
    const { filters, limit = 100 } = node.data;

    try {
      const startTime = Date.now();

      // 1. Create HubSpot adapter
      const adapter = new HubSpotAdapter(context.userId);

      // 3. Resolve filters from workflow context
      const resolvedFilters = this.resolveFilters(filters || [], context);

      // 4. Search contacts
      const contacts = await adapter.searchContacts(resolvedFilters, limit);

      const durationMs = Date.now() - startTime;

      return {
        success: true,
        action: 'search_contacts',
        contacts: contacts.map((contact) => ({
          id: contact.id,
          email: contact.properties.email,
          firstname: contact.properties.firstname,
          lastname: contact.properties.lastname,
          properties: contact.properties,
        })),
        totalResults: contacts.length,
        durationMs,
        executedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      // Log usage as error
      await hubspotOAuthService.logUsage(
        context.userId,
        'search_contacts',
        'error',
        error.message
      );

      throw new Error(`HubSpot Search Contacts failed: ${error.message}`);
    }
  }

  /**
   * Resolve filters from workflow context
   */
  private resolveFilters(
    filters: SearchFilter[],
    context: ExecutionContext
  ): Array<{ property: string; operator: string; value: string }> {
    if (!Array.isArray(filters)) {
      return [];
    }

    return filters.map((filter) => {
      let value = filter.value;

      // Resolve value from variable if source is provided
      if (filter.valueSource) {
        const resolvedValue = resolveVariableValue(filter.valueSource, context);
        value = resolvedValue !== undefined ? String(resolvedValue) : filter.value;
      }

      return {
        property: filter.property,
        operator: filter.operator,
        value,
      };
    });
  }
}
