/**
 * Toggle Favorite Command
 *
 * Command for marking/unmarking a template as favorite.
 */
export class ToggleFavoriteCommand {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly isFavorite: boolean,
  ) {}
}
