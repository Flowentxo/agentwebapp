/**
 * HubSpot Tools
 * Phase 12: Tool Execution Layer
 *
 * HubSpot CRM tools for contacts, deals, and companies
 */

import {
  ToolContext,
  ToolResult,
  ToolParameter,
  HubSpotCreateContactInput,
  HubSpotContactOutput,
  HubSpotCreateDealInput,
  HubSpotDealOutput,
} from '@/lib/tools/interfaces';
import { AuthenticatedTool } from './AuthenticatedTool';
import { createLogger } from '@/lib/logger';

const logger = createLogger('HubSpotTools');

// HubSpot API base URL
const HUBSPOT_API_BASE = 'https://api.hubapi.com';

// ============================================================================
// HUBSPOT CREATE CONTACT TOOL
// ============================================================================

export class HubSpotCreateContactTool extends AuthenticatedTool<
  HubSpotCreateContactInput,
  HubSpotContactOutput
> {
  id = 'hubspot-create-contact';
  name = 'Create Contact';
  description = 'Create a new contact in HubSpot CRM';
  category = 'crm' as const;
  provider = 'hubspot';
  icon = 'UserPlus';

  requiredScopes = ['crm.objects.contacts.write'];

  parameters: ToolParameter[] = [
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      description: 'Contact email address',
      placeholder: 'contact@example.com',
    },
    {
      name: 'firstname',
      label: 'First Name',
      type: 'string',
      required: false,
      description: 'Contact first name',
      placeholder: 'John',
    },
    {
      name: 'lastname',
      label: 'Last Name',
      type: 'string',
      required: false,
      description: 'Contact last name',
      placeholder: 'Doe',
    },
    {
      name: 'phone',
      label: 'Phone',
      type: 'string',
      required: false,
      description: 'Contact phone number',
      placeholder: '+1 555 123 4567',
    },
    {
      name: 'company',
      label: 'Company',
      type: 'string',
      required: false,
      description: 'Company name',
      placeholder: 'Acme Inc.',
    },
    {
      name: 'jobtitle',
      label: 'Job Title',
      type: 'string',
      required: false,
      description: 'Contact job title',
      placeholder: 'Sales Manager',
    },
    {
      name: 'lifecyclestage',
      label: 'Lifecycle Stage',
      type: 'string',
      required: false,
      default: 'lead',
      description: 'Contact lifecycle stage',
      options: [
        { label: 'Subscriber', value: 'subscriber' },
        { label: 'Lead', value: 'lead' },
        { label: 'MQL', value: 'marketingqualifiedlead' },
        { label: 'SQL', value: 'salesqualifiedlead' },
        { label: 'Opportunity', value: 'opportunity' },
        { label: 'Customer', value: 'customer' },
      ],
    },
  ];

  async execute(
    input: HubSpotCreateContactInput,
    context: ToolContext
  ): Promise<ToolResult<HubSpotContactOutput>> {
    // Validate input
    const validation = this.validateInput(input);
    if (!validation.valid) {
      return this.error(validation.errors.join(', '), 'VALIDATION_ERROR');
    }

    try {
      // Get access token
      const accessToken = await this.getAccessToken(
        context.userId,
        context.workspaceId
      );

      // Build properties object
      const properties: Record<string, string> = {
        email: input.email,
      };

      if (input.firstname) properties.firstname = input.firstname;
      if (input.lastname) properties.lastname = input.lastname;
      if (input.phone) properties.phone = input.phone;
      if (input.company) properties.company = input.company;
      if (input.jobtitle) properties.jobtitle = input.jobtitle;
      if (input.lifecyclestage) properties.lifecyclestage = input.lifecyclestage;
      if (input.website) properties.website = input.website;

      // Add custom properties
      if (input.customProperties) {
        Object.assign(properties, input.customProperties);
      }

      // Create contact via HubSpot API
      const response = await this.createContact(accessToken, properties);

      logger.info(`[hubspot-create-contact] Contact created: ${response.id}`);

      return this.success({
        id: response.id,
        email: input.email,
        firstname: input.firstname,
        lastname: input.lastname,
        createdAt: new Date(response.createdAt),
        updatedAt: new Date(response.updatedAt),
        properties: response.properties,
      });
    } catch (error: any) {
      logger.error('[hubspot-create-contact] Failed:', error);

      // Handle specific HubSpot errors
      if (error.status === 409) {
        return this.error(
          'A contact with this email already exists',
          'DUPLICATE_CONTACT'
        );
      }

      if (error.status === 401) {
        return this.error(
          'HubSpot authentication failed. Please reconnect your account.',
          'AUTH_ERROR'
        );
      }

      return this.error(
        error.message || 'Failed to create contact',
        'CREATE_ERROR'
      );
    }
  }

  /**
   * Create contact via HubSpot API
   */
  private async createContact(
    accessToken: string,
    properties: Record<string, string>
  ): Promise<{
    id: string;
    properties: Record<string, string>;
    createdAt: string;
    updatedAt: string;
  }> {
    const url = `${HUBSPOT_API_BASE}/crm/v3/objects/contacts`;

    return this.apiRequest(url, {
      method: 'POST',
      accessToken,
      body: { properties },
    });
  }
}

// ============================================================================
// HUBSPOT UPDATE CONTACT TOOL
// ============================================================================

export class HubSpotUpdateContactTool extends AuthenticatedTool<
  { contactId: string; properties: Record<string, string> },
  HubSpotContactOutput
> {
  id = 'hubspot-update-contact';
  name = 'Update Contact';
  description = 'Update an existing contact in HubSpot CRM';
  category = 'crm' as const;
  provider = 'hubspot';
  icon = 'UserCog';

  requiredScopes = ['crm.objects.contacts.write'];

  parameters: ToolParameter[] = [
    {
      name: 'contactId',
      label: 'Contact ID',
      type: 'string',
      required: true,
      description: 'HubSpot Contact ID to update',
    },
    {
      name: 'properties',
      label: 'Properties',
      type: 'object',
      required: true,
      description: 'Properties to update (key-value pairs)',
    },
  ];

  async execute(
    input: { contactId: string; properties: Record<string, string> },
    context: ToolContext
  ): Promise<ToolResult<HubSpotContactOutput>> {
    try {
      const accessToken = await this.getAccessToken(
        context.userId,
        context.workspaceId
      );

      const url = `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${input.contactId}`;

      const response = await this.apiRequest<{
        id: string;
        properties: Record<string, string>;
        createdAt: string;
        updatedAt: string;
      }>(url, {
        method: 'PATCH',
        accessToken,
        body: { properties: input.properties },
      });

      return this.success({
        id: response.id,
        email: response.properties.email,
        firstname: response.properties.firstname,
        lastname: response.properties.lastname,
        createdAt: new Date(response.createdAt),
        updatedAt: new Date(response.updatedAt),
        properties: response.properties,
      });
    } catch (error: any) {
      logger.error('[hubspot-update-contact] Failed:', error);
      return this.error(error.message, 'UPDATE_ERROR');
    }
  }
}

// ============================================================================
// HUBSPOT CREATE DEAL TOOL
// ============================================================================

export class HubSpotCreateDealTool extends AuthenticatedTool<
  HubSpotCreateDealInput,
  HubSpotDealOutput
> {
  id = 'hubspot-create-deal';
  name = 'Create Deal';
  description = 'Create a new deal in HubSpot CRM';
  category = 'crm' as const;
  provider = 'hubspot';
  icon = 'DollarSign';

  requiredScopes = ['crm.objects.deals.write'];

  parameters: ToolParameter[] = [
    {
      name: 'dealname',
      label: 'Deal Name',
      type: 'string',
      required: true,
      description: 'Name of the deal',
      placeholder: 'Enterprise License - Q4',
    },
    {
      name: 'amount',
      label: 'Amount',
      type: 'number',
      required: false,
      description: 'Deal amount',
      placeholder: '10000',
    },
    {
      name: 'dealstage',
      label: 'Deal Stage',
      type: 'string',
      required: false,
      description: 'Current stage of the deal',
      options: [
        { label: 'Appointment Scheduled', value: 'appointmentscheduled' },
        { label: 'Qualified to Buy', value: 'qualifiedtobuy' },
        { label: 'Presentation Scheduled', value: 'presentationscheduled' },
        { label: 'Decision Maker Bought-In', value: 'decisionmakerboughtin' },
        { label: 'Contract Sent', value: 'contractsent' },
        { label: 'Closed Won', value: 'closedwon' },
        { label: 'Closed Lost', value: 'closedlost' },
      ],
    },
    {
      name: 'closedate',
      label: 'Close Date',
      type: 'string',
      required: false,
      description: 'Expected close date (YYYY-MM-DD)',
      placeholder: '2024-12-31',
    },
    {
      name: 'pipeline',
      label: 'Pipeline',
      type: 'string',
      required: false,
      description: 'Pipeline ID',
      default: 'default',
    },
  ];

  async execute(
    input: HubSpotCreateDealInput,
    context: ToolContext
  ): Promise<ToolResult<HubSpotDealOutput>> {
    const validation = this.validateInput(input);
    if (!validation.valid) {
      return this.error(validation.errors.join(', '), 'VALIDATION_ERROR');
    }

    try {
      const accessToken = await this.getAccessToken(
        context.userId,
        context.workspaceId
      );

      // Build properties
      const properties: Record<string, string | number> = {
        dealname: input.dealname,
      };

      if (input.amount !== undefined) properties.amount = input.amount;
      if (input.dealstage) properties.dealstage = input.dealstage;
      if (input.closedate) properties.closedate = input.closedate;
      if (input.pipeline) properties.pipeline = input.pipeline;
      if (input.hubspot_owner_id) properties.hubspot_owner_id = input.hubspot_owner_id;

      // Add custom properties
      if (input.customProperties) {
        Object.assign(properties, input.customProperties);
      }

      const url = `${HUBSPOT_API_BASE}/crm/v3/objects/deals`;

      const response = await this.apiRequest<{
        id: string;
        properties: Record<string, string>;
        createdAt: string;
        updatedAt: string;
      }>(url, {
        method: 'POST',
        accessToken,
        body: { properties },
      });

      // Handle associations if provided
      if (input.associatedContactIds?.length) {
        await this.associateContacts(
          accessToken,
          response.id,
          input.associatedContactIds
        );
      }

      logger.info(`[hubspot-create-deal] Deal created: ${response.id}`);

      return this.success({
        id: response.id,
        dealname: input.dealname,
        amount: input.amount,
        dealstage: input.dealstage || 'appointmentscheduled',
        pipeline: input.pipeline || 'default',
        createdAt: new Date(response.createdAt),
        updatedAt: new Date(response.updatedAt),
        properties: response.properties,
      });
    } catch (error: any) {
      logger.error('[hubspot-create-deal] Failed:', error);
      return this.error(error.message, 'CREATE_ERROR');
    }
  }

  /**
   * Associate contacts with a deal
   */
  private async associateContacts(
    accessToken: string,
    dealId: string,
    contactIds: string[]
  ): Promise<void> {
    const url = `${HUBSPOT_API_BASE}/crm/v3/objects/deals/${dealId}/associations/contacts`;

    for (const contactId of contactIds) {
      await this.apiRequest(url, {
        method: 'PUT',
        accessToken,
        body: {
          toObjectId: contactId,
          associationType: 'deal_to_contact',
        },
      });
    }
  }
}

// ============================================================================
// HUBSPOT SEARCH CONTACTS TOOL
// ============================================================================

export class HubSpotSearchContactsTool extends AuthenticatedTool<
  { query: string; limit?: number },
  { contacts: HubSpotContactOutput[]; total: number }
> {
  id = 'hubspot-search-contacts';
  name = 'Search Contacts';
  description = 'Search for contacts in HubSpot CRM';
  category = 'crm' as const;
  provider = 'hubspot';
  icon = 'Search';

  requiredScopes = ['crm.objects.contacts.read'];

  parameters: ToolParameter[] = [
    {
      name: 'query',
      label: 'Search Query',
      type: 'string',
      required: true,
      description: 'Search term (email, name, company)',
      placeholder: 'john@example.com',
    },
    {
      name: 'limit',
      label: 'Limit',
      type: 'number',
      required: false,
      default: 10,
      description: 'Maximum results to return',
    },
  ];

  async execute(
    input: { query: string; limit?: number },
    context: ToolContext
  ): Promise<ToolResult<{ contacts: HubSpotContactOutput[]; total: number }>> {
    try {
      const accessToken = await this.getAccessToken(
        context.userId,
        context.workspaceId
      );

      const url = `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/search`;

      const response = await this.apiRequest<{
        total: number;
        results: Array<{
          id: string;
          properties: Record<string, string>;
          createdAt: string;
          updatedAt: string;
        }>;
      }>(url, {
        method: 'POST',
        accessToken,
        body: {
          query: input.query,
          limit: input.limit || 10,
          properties: ['email', 'firstname', 'lastname', 'company', 'phone'],
        },
      });

      const contacts = response.results.map((result) => ({
        id: result.id,
        email: result.properties.email,
        firstname: result.properties.firstname,
        lastname: result.properties.lastname,
        createdAt: new Date(result.createdAt),
        updatedAt: new Date(result.updatedAt),
        properties: result.properties,
      }));

      return this.success({
        contacts,
        total: response.total,
      });
    } catch (error: any) {
      logger.error('[hubspot-search-contacts] Failed:', error);
      return this.error(error.message, 'SEARCH_ERROR');
    }
  }
}

// Export tool instances
export const hubspotCreateContactTool = new HubSpotCreateContactTool();
export const hubspotUpdateContactTool = new HubSpotUpdateContactTool();
export const hubspotCreateDealTool = new HubSpotCreateDealTool();
export const hubspotSearchContactsTool = new HubSpotSearchContactsTool();
