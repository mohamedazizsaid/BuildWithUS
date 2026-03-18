export class BusinessRuleException extends Error {
  public readonly aggregateName: string;

  constructor(aggregateName: string, message: string) {
    super(`[${aggregateName}] ${message}`);
    this.aggregateName = aggregateName;
    this.name = 'BusinessRuleException';
  }
}

export class NotFoundException extends Error {
  public readonly resourceType: string;
  public readonly resourceId: string;

  constructor(resourceType: string, resourceId: string) {
    super(`${resourceType} with id '${resourceId}' not found`);
    this.resourceType = resourceType;
    this.resourceId = resourceId;
    this.name = 'NotFoundException';
  }
}
