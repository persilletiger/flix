package ca.uwaterloo.flix.language.phase

import ca.uwaterloo.flix.api.Flix
import ca.uwaterloo.flix.language.ast.TypedAst
import ca.uwaterloo.flix.language.ast.TypedAst.Root
import ca.uwaterloo.flix.language.errors.DeadCodeError
import ca.uwaterloo.flix.util.Validation._
import ca.uwaterloo.flix.util.Validation
import ca.uwaterloo.flix.language.ast.Symbol

object DeadCode extends Phase[Root, Root] {

  def run(root: Root)(implicit flix: Flix): Validation[Root, DeadCodeError] = flix.phase("DeadCode") {

    val newDefs = traverse(root.defs)  {
      case (sym, defn) => visitDef(defn).map(x => sym -> x)
    }


    mapN(newDefs) {
      case defs => root.copy(defs = defs.toMap)
    }
  }

  private def visitDef(defn: TypedAst.Def): Validation[TypedAst.Def, DeadCodeError] =
    mapN(visitExp(defn.exp)) {
      case _ => defn
    }

  private def visitExp(e: TypedAst.Expression): Validation[TypedAst.Expression, DeadCodeError] =
    e match {
      case TypedAst.Expression.Lambda(fparam, exp, tpe, eff, loc) =>
        if (freeVar(e).contains(fparam.sym)) {
          e.toSuccess
        } else {
          DeadCodeError(fparam.sym.loc, "Lambda parameter never used.").toFailure
        }
      case TypedAst.Expression.Apply(exp1, exp2, tpe, eff, loc) =>
        val applyVal1 = visitExp(exp1)
        val applyVal2 = visitExp(exp2)
        mapN(applyVal1, applyVal2) {
          case (applyVal1, applyVal2) => e
        }
      case TypedAst.Expression.Unary(op, exp, tpe, eff, loc) =>
        val unaryVal = visitExp(exp)
        mapN(unaryVal) {
          case (unaryVal) => e
        }
      case TypedAst.Expression.Binary(op, exp1, exp2, tpe, eff, loc) =>
        val binaryVal1 = visitExp(exp1)
        val binaryVal2 = visitExp(exp2)
        mapN(binaryVal1, binaryVal2) {
          case (binaryVal1, binaryVal2) => e
        }
      case TypedAst.Expression.Let(sym, exp1, exp2, tpe, eff, loc) =>
        if (freeVar(exp2).contains(sym)) {
          e.toSuccess
        } else {
          DeadCodeError(sym.loc, "Variable never used.").toFailure
        }
      case TypedAst.Expression.LetRec(sym, exp1, exp2, tpe, eff, loc) =>
        val letRecVal1 = visitExp(exp1)
        val letRecVal2 = visitExp(exp2)
        mapN(letRecVal1, letRecVal2) {
          case (letRecVal1, letRecVal2) => e
        }
      case TypedAst.Expression.IfThenElse(exp1, exp2, exp3, tpe, eff, loc) =>
        val condVal = visitExp(exp1)
        val thenVal = visitExp(exp2)
        val elseVal = visitExp(exp3)
        mapN(condVal, thenVal, elseVal) {
          case (condExp, thenExp, elseExp) => e
        }
      case TypedAst.Expression.Match(exp, rules, tpe, eff, loc) =>
        val matchVal = visitExp(exp)
        val symVal = (for (r <- rules) yield {
          if (patternVar(r.pat).subsetOf(freeVar(r.exp))) {
            List.empty
          } else {
            patternVar(r.pat).diff(freeVar(r.exp))
          }
        }).flatten
        val patVarVal = if (symVal.length == 0) e.toSuccess else DeadCodeError(symVal.head.loc, "Matching variable(s) not used in expression.").toFailure
        mapN(matchVal, patVarVal) {
          case (matchVal, patVarVal) => e
        }
      case TypedAst.Expression.Switch(rules, tpe, eff, loc) => e.toSuccess // TODO
      case TypedAst.Expression.Tag(sym, tag, exp, tpe, eff, loc) => e.toSuccess // TODO
      case _ => e.toSuccess
    }

  private def freeVar(exp: TypedAst.Expression): Set[Symbol.VarSym] =
    exp match {
      case TypedAst.Expression.Var(sym, tpe, eff, loc) => Set(sym)
      case TypedAst.Expression.Lambda(fparam, exp, tpe, eff, loc) => freeVar(exp)
      case TypedAst.Expression.Apply(exp1, exp2, tpe, eff, loc) => freeVar(exp1) ++ freeVar(exp2)
      case TypedAst.Expression.Unary(op, exp, tpe, eff, loc) => freeVar(exp)
      case TypedAst.Expression.Binary(op, exp1, exp2, tpe, eff, loc) => freeVar(exp1) ++ freeVar(exp2)
      case TypedAst.Expression.Let(sym, exp1, exp2, tpe, eff, loc) => freeVar(exp1) ++ freeVar(exp2)
      case TypedAst.Expression.LetRec(sym, exp1, exp2, tpe, eff, loc) => freeVar(exp1) ++ freeVar(exp2)
      case TypedAst.Expression.IfThenElse(exp1, exp2, exp3, tpe, eff, loc) => freeVar(exp1) ++ freeVar(exp2) ++ freeVar(exp3)
      case TypedAst.Expression.Match(exp, rules, tpe, eff, loc) => freeVar(exp) ++ (for (r <- rules) yield freeVar(r.exp)).flatten.toSet // TODO: Is this correct?
      case TypedAst.Expression.Switch(rules, tpe, eff, loc) => (for (r <- rules) yield freeVar(r._1) ++ freeVar(r._2)).flatten.toSet
      case TypedAst.Expression.Tag(sym, tag, exp, tpe, eff, loc) => freeVar(exp)
      case TypedAst.Expression.Tuple(elms, tpe, eff, loc) => (for (e <- elms) yield freeVar(e)).flatten.toSet
      case TypedAst.Expression.RecordSelect(exp, label, tpe, eff, loc) => freeVar(exp)
      case TypedAst.Expression.RecordExtend(label, value, rest, tpe, eff, loc) => freeVar(value) ++ freeVar(rest)
      case TypedAst.Expression.RecordRestrict(label, rest, tpe, eff, loc) => freeVar(rest)
      case TypedAst.Expression.ArrayLit(elms, tpe, eff, loc) => (for (e <- elms) yield freeVar(e)).flatten.toSet
      case TypedAst.Expression.ArrayNew(elm, len, tpe, eff, loc) => freeVar(elm) ++ freeVar(len)
      case TypedAst.Expression.ArrayLoad(base, index, tpe, eff, loc) => freeVar(base) ++ freeVar(index)
      case TypedAst.Expression.ArrayStore(base, index, elm, tpe, eff, loc) => freeVar(base) ++ freeVar(index) ++ freeVar(elm)
      case TypedAst.Expression.ArraySlice(base, beginIndex, endIndex, tpe, eff, loc) => freeVar(base) ++ freeVar(beginIndex) ++ freeVar(endIndex)
      case TypedAst.Expression.VectorLit(elms, tpe, eff, loc) => (for (e <- elms) yield freeVar(e)).flatten.toSet
      case TypedAst.Expression.VectorNew(elm, len, tpe, eff, loc) => freeVar(elm)
      case TypedAst.Expression.VectorLoad(base, index, tpe, eff, loc) => freeVar(base)
      case TypedAst.Expression.VectorStore(base, index, elm, tpe, eff, loc) => freeVar(base) ++ freeVar(elm)
      case TypedAst.Expression.VectorLength(base, tpe, eff, loc) => freeVar(base)
      case TypedAst.Expression.VectorSlice(base, startIndex, endIndex, tpe, eff, loc) => freeVar(base) ++ freeVar(endIndex)
      case TypedAst.Expression.Ref(exp, tpe, eff, loc) => freeVar(exp)
      case TypedAst.Expression.Deref(exp, tpe, eff, loc) => freeVar(exp)
      case TypedAst.Expression.Assign(exp1, exp2, tpe, eff, loc) => freeVar(exp1) ++ freeVar(exp2)
      case TypedAst.Expression.HandleWith(exp, bindings, tpe, eff, loc) => freeVar(exp) ++ (for (b <- bindings) yield freeVar(b.exp)).flatten.toSet
      case TypedAst.Expression.Existential(fparam, exp, eff, loc) => freeVar(exp)
      case TypedAst.Expression.Universal(fparam, exp, eff, loc) => freeVar(exp)
      case TypedAst.Expression.Ascribe(exp, tpe, eff, loc) => freeVar(exp)
      case TypedAst.Expression.Cast(exp, tpe, eff, loc) => freeVar(exp)
      case TypedAst.Expression.NativeConstructor(constructor, args, tpe, eff, loc) => (for (a <- args) yield freeVar(a)).flatten.toSet
      case TypedAst.Expression.TryCatch(exp, rules, tpe, eff, loc) => freeVar(exp) ++ (for (r <- rules) yield freeVar(r.exp)).flatten.toSet
      case TypedAst.Expression.NativeMethod(method, args, tpe, eff, loc) => (for (a <- args) yield freeVar(a)).flatten.toSet
      case TypedAst.Expression.NewChannel(exp, tpe, eff, loc) => freeVar(exp)
      case TypedAst.Expression.GetChannel(exp, tpe, eff, loc) => freeVar(exp)
      case TypedAst.Expression.PutChannel(exp1, exp2, tpe, eff, loc) => freeVar(exp1) ++ freeVar(exp2)
      case TypedAst.Expression.SelectChannel(rules, default, tpe, eff, loc) =>
        (for (r <- rules) yield freeVar(r.chan) ++ freeVar(r.exp)).flatten.toSet ++ (default match {
          case None => Set.empty
          case Some(e) => freeVar(e)
        })
      case TypedAst.Expression.Spawn(exp, tpe, eff, loc) => freeVar(exp)
      case TypedAst.Expression.Sleep(exp, tpe, eff, loc) => freeVar(exp)
      case TypedAst.Expression.FixpointCompose(exp1, exp2, tpe, eff, loc) => freeVar(exp1) ++ freeVar(exp2)
      case TypedAst.Expression.FixpointSolve(exp, tpe, eff, loc) => freeVar(exp)
      case TypedAst.Expression.FixpointProject(pred, exp, tpe, eff, loc) => freeVar(pred.exp) ++ freeVar(exp)
      case TypedAst.Expression.FixpointEntails(exp1, exp2, tpe, eff, loc) => freeVar(exp1) ++ freeVar(exp2)
      case _ => Set.empty
    }

  private def patternVar(pat: TypedAst.Pattern): Set[Symbol.VarSym] =
    pat match {
      case TypedAst.Pattern.Var(sym, tpe, loc) => Set(sym)
      case TypedAst.Pattern.Tag(sym, tag, pat, tpe, loc) => patternVar(pat) // Correct?
      case TypedAst.Pattern.Tuple(elms, tpe, loc) => (for (e <- elms) yield patternVar(e)).flatten.toSet
    }
}
