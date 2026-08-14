export interface Customer {
  id:string; name:string; phone:string; email?:string|null; address?:string|null;
  city?:string|null; state?:string|null; pin_code?:string|null; gstin?:string|null;
}
