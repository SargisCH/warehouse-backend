import { WeekDay } from 'src/shared/constants/global.constants';

export type ClientDTO = {
  name: string;
  companyCode: string;
  companyType: string;
  companyId: string;
  accountNumber: string;
  bankAccountNumber: string;
  legalAddress: string;
  address: string;
  phoneNumber: string;
  otherPhoneNumber: string;
  email: string;
  contactPerson: string;
  taxId: string;
  managerId?: number;
  dayPlan?: WeekDay[];
};
