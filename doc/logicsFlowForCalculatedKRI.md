Think about "Quick Actions" should include Approve/Reject button for calculated KRI @KRIDetail.vue. Think about the logics flow it should have.
Steps:

1. Each assigned user input their atomic value
2. User from same department can review and approve/reject the calculated KRI (data provider approver) [case: own <> provider]
   -> inputter part done
3. Owner review each KRIs and reject atomic value (send back to inputter)
   -> check if all requirement are finalized, if so, auto recalculate KRI
4. Owner can Approve/Reject KRI OR mannual Override KRI value (Calculated KRIs ONLY) (not recommended AND when not finalized, ALSO ask for reason and log it in audit trail(mark as important override))
5. Finalize KRI
