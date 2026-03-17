import { Module } from '@nestjs/common';
import { MastersModule } from './masters/masters.module';
import { CategoriesModule } from './categories/categories.module';
import { CitiesModule } from './cities/cities.module';
import { TariffsModule } from './tariffs/tariffs.module';
import { LeadsModule } from './leads/leads.module';
import { BookingsModule } from './bookings/bookings.module';
import { ReviewsModule } from './reviews/reviews.module';
import { FavoritesModule } from './favorites/favorites.module';
import { ChatModule } from './chat/chat.module';
import { PromotionsModule } from './promotions/promotions.module';

/**
 * Aggregate module for marketplace: masters, categories, cities, tariffs, leads, bookings, reviews, favorites, chat, promotions.
 */
@Module({
  imports: [
    MastersModule,
    CategoriesModule,
    CitiesModule,
    TariffsModule,
    LeadsModule,
    BookingsModule,
    ReviewsModule,
    FavoritesModule,
    ChatModule,
    PromotionsModule,
  ],
})
export class MarketplaceGroupModule {}
