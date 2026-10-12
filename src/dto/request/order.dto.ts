import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsPositive,
  MaxLength,
} from 'class-validator';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  referenceId!: string;

  @IsInt()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
