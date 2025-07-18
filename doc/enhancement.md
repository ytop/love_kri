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
  Action 10 --> 40, kri inputer submit data
        40 --> 50, kri acknowledger approve kri

case 2, if data provide <> kri owner, 10 --> 30 -- > 40 --> 50 --> 60
  Action 10 --> 30, data provider appover

case 3,  in case 1, 40 --> 50 approve, if reject, 40 --> 20
         in case 2, 30 --> 40 , if reject, 30 --> 20
                    40 --> 50, if reject, 40 --> 20

# New rules

Public Const gStatusPendingInput As String = "Pending Input" ' 1
Public Const gStatusPendingSubmit As String = "Saved" ' 2
Public Const gStatusPendingAdjust As String = "Adjusting" ' 3
Public Const gStatusPendingAcknowledg As String = "Submitted" ' 4
Public Const gStatusFinalized As String = "Finalized" ' 5

"Pending Input" ' 10 --> previous 1
"Under Rework" ' 20 --> previous 3
"Saved" ' 30 --> previous 2 Saved
"Submitted to Data Provider Approver" ' 40 --> previous 2 Saved
"Submitted to KRI Owner Approver" ' 50 --> previous 4
"Finalized" ' 60 --> previous 5

Function GetNextStatus(tabName As String, iPrevStatus As Integer) As Integer
    If InStr(tabName, "Acknowledge") <> 0 Then
        GetNextStatus = IIf(iPrevStatus = 4 Or iPrevStatus = -1, 5, 0)
    ElseIf InStr(tabName, "ReturnForWork") <> 0 Then
        GetNextStatus = IIf(iPrevStatus = 4 Or iPrevStatus = -1, 3, 0)
    ElseIf InStr(tabName, "Submit") <> 0 Then
        GetNextStatus = IIf(iPrevStatus <= 3 Or iPrevStatus = -1, 4, 0)
    ElseIf InStr(tabName, "Save") <> 0 Then
        GetNextStatus = IIf(iPrevStatus <= 3 Or iPrevStatus = -1, 2, 0)
    ElseIf InStr(tabName, "Data Provider") <> 0 Then
        GetNextStatus = IIf(iPrevStatus <= 3 Or iPrevStatus = -1, 4, 0)
    ElseIf InStr(tabName, "ReturnForWorkDP") <> 0 Then
        GetNextStatus = IIf(iPrevStatus = 4 Or iPrevStatus = -1, 3, 0)
    Else
        GetNextStatus = -1
    End If

case 1: 10 --> 30 -->

change status



=============== task 2 ===================================

Union view,
in KRITableCollectData.vue, merge kri data element / atomic into the list view,

================ task 3 ====================
split  KRITableCollectData.vue into 'input' & 'approve',  update button name
add rework comments in 'approve' panel
