1. button too close,
2. KRI Status

in helper.js,

export const mapKriStatus = (status) => {
  if (status === null || status === undefined) return 'Pending';
  switch (status) {
    case 0:
      return 'Pending';
    case 1:
      return 'Submitted';
    case 2:
      return 'Finalized';
    default:
      return `Unknown (${status})`;
  }
};

New status

Public Const gStatusPendingInput As String = "Pending Input" ' 10
Public Const gStatusPendingAdjust As String = "Adjusting" ' 20
Public Const gStatusPendingDPApprove As String = "Pending Data Provider Approval" ' 30
Public Const gStatusPendingSubmit As String = "Ready for submission" ' 40
Public Const gStatusPendingAcknowledg As String = "Submitted" ' 50
Public Const gStatusFinalized As String = "Finalized" ' 60

case 1, if data provide = kri owner, 10 --> 40 --> 50 --> 60 
  Action 10 --> 40, kri inpuuter submit data
        40 --> 50, kri acknowledger approve kri

case 2, if data provide <> kri owner, 10 --> 30 -- > 40 --> 50 --> 60 
  Action 10 --> 30, data provider appover

case 3,  in case 1, 40 --> 50 approve, if reject, 40 --> 20
         in case 2, 30 --> 40 , if reject, 30 --> 20 
                    40 --> 50, if reject, 40 --> 20

change status
change sample data,


=============== task 2 ===================================

Union view,
in KRITableCollectData.vue, merge kri data element / atomic into the list view, 

================ task 3 ====================
split  KRITableCollectData.vue into 'input' & 'approve',  update button name
add rework comments in 'approve' panel
