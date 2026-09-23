import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  IsDateString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateLibraryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  campusId?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  locationDetails?: string;
}

export class CreateLibraryLocationDto {
  @IsString()
  @IsNotEmpty()
  libraryId: string;

  @IsString()
  @IsNotEmpty()
  shelf: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  building?: string;

  @IsString()
  @IsOptional()
  floor?: string;

  @IsString()
  @IsOptional()
  room?: string;

  @IsString()
  @IsOptional()
  section?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateBookCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreatePublisherDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  contact?: string;

  @IsString()
  @IsOptional()
  website?: string;

  @IsString()
  @IsOptional()
  address?: string;
}

export class CreateAuthorDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  alternateName?: string;

  @IsString()
  @IsOptional()
  biography?: string;
}

export class CreateBookDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsString()
  @IsOptional()
  isbn10?: string;

  @IsString()
  @IsOptional()
  isbn13?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  publisherId?: string;

  @IsString()
  @IsOptional()
  edition?: string;

  @IsNumber()
  @IsOptional()
  publicationYear?: number;

  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  coverImageUrl?: string;

  @IsArray()
  @IsOptional()
  keywords?: string[];

  @IsArray()
  @IsOptional()
  authorIds?: string[];
}

export class UpdateBookDto extends CreateBookDto {
  @IsString()
  @IsOptional()
  status?: string;
}

export class CreateBookCopyDto {
  @IsString()
  @IsNotEmpty()
  bookId: string;

  @IsString()
  @IsOptional()
  libraryId?: string;

  @IsString()
  @IsOptional()
  locationId?: string;

  @IsString()
  @IsOptional()
  accessionNumber?: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsString()
  @IsOptional()
  condition?: string;

  @IsDateString()
  @IsOptional()
  acquisitionDate?: string;

  @IsNumber()
  @IsOptional()
  cost?: number;

  @IsString()
  @IsOptional()
  supplier?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateBookCopyStatusDto {
  @IsString()
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsOptional()
  condition?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class RegisterLibraryMemberDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsOptional()
  studentProfileId?: string;

  @IsString()
  @IsOptional()
  employeeProfileId?: string;

  @IsString()
  @IsOptional()
  membershipNumber?: string;

  @IsString()
  @IsOptional()
  memberType?: 'STUDENT' | 'TEACHER' | 'STAFF' | 'OTHER';

  @IsNumber()
  @IsOptional()
  @Min(1)
  borrowingLimit?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  maxBorrowDays?: number;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class IssueBookDto {
  @IsString()
  @IsNotEmpty()
  copyId: string;

  @IsString()
  @IsNotEmpty()
  memberId: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ReturnBookDto {
  @IsString()
  @IsNotEmpty()
  copyId: string;

  @IsString()
  @IsOptional()
  returnCondition?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class RenewLoanDto {
  @IsString()
  @IsNotEmpty()
  loanId: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateReservationDto {
  @IsString()
  @IsNotEmpty()
  bookId: string;

  @IsString()
  @IsNotEmpty()
  memberId: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class AssessFineDto {
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  loanId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class WaiveFineDto {
  @IsString()
  @IsNotEmpty()
  waiverReason: string;
}
