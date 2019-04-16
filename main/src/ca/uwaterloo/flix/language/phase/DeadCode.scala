package ca.uwaterloo.flix.language.phase

import ca.uwaterloo.flix.api.Flix
import ca.uwaterloo.flix.language.ast.TypedAst
import ca.uwaterloo.flix.language.ast.TypedAst.Root
import ca.uwaterloo.flix.language.errors.DeadCodeError
import ca.uwaterloo.flix.util.Validation._
import ca.uwaterloo.flix.util.Validation
import ca.uwaterloo.flix.language.ast.Symbol
import ca.uwaterloo.flix.language.ast.Symbol.EnumSym

object DeadCode extends Phase[Root, Root] {

  def run(root: Root)(implicit flix: Flix): Validation[Root, DeadCodeError] = flix.phase("DeadCode") {
    // TODO: Improve weird/terrible code below
    val defsRes = root.defs.map(x => visitDef(x._2)).toList.unzip
    val defsVal = defsRes._1
    val defsEnums = defsRes._2.flatten.toSet
    val enums = root.enums.values.map(x => visitEnum(x)).toSet.flatten
    val unusedEnums = enums.diff(defsEnums)
    // TODO: Restructure code (visitEnum, etc.) so that we can retrieve correct loc
    val enumsVal = if (unusedEnums.size == 0) {
      root.enums.toSuccess
    } else {
      val head = unusedEnums.head
      DeadCodeError(root.enums(head._1).cases(head._2).loc, "Enum case never used").toFailure
    }
    val newDefs = traverse(defsVal) {
      case defn => defn.map(x => x.sym -> x)
    }

    mapN(newDefs, enumsVal) {
      case (defs, enums) => root.copy(defs = defs.toMap)
    }
  }

  private def visitEnum(enum: TypedAst.Enum): Map[Symbol.EnumSym, String] = enum.cases.map(x => (x._2.sym -> x._2.tag.name)) // TODO: Improve

  private def visitDef(defn: TypedAst.Def): (Validation[TypedAst.Def, DeadCodeError], Set[(Symbol.EnumSym, String)]) = {
    val defVal = visitExp(defn.exp)
    val defEnums = defVal match {
      case Validation.Success(value) => value.tags
      case _ => Set.empty[(Symbol.EnumSym, String)] // TODO: Think this through
    }
    (mapN(defVal) {
      case _ => defn
    }, defEnums)
  }

  // TODO: Clean up variable names now that this functions returns things other than Validation
  private def visitExp(e: TypedAst.Expression): (Validation[Used, DeadCodeError]) =
    e match {
      case TypedAst.Expression.Var(sym, tpe, eff, loc) =>
        Used(Set(sym), Set.empty).toSuccess
      case TypedAst.Expression.Lambda(fparam, exp, tpe, eff, loc) =>
        val expVal = visitExp(exp)
        if (expVal.get.vars.contains(fparam.sym)) { // TODO: Account for case of Failure
          expVal
        } else {
          DeadCodeError(fparam.sym.loc, "Lambda parameter never used.").toFailure
        }
      case TypedAst.Expression.Apply(exp1, exp2, tpe, eff, loc) =>
        mapN(visitExp(exp1), visitExp(exp2)) {
          case (e1, e2) => e1 + e2
        }
      case TypedAst.Expression.Unary(op, exp, tpe, eff, loc) => visitExp(exp)
      case TypedAst.Expression.Binary(op, exp1, exp2, tpe, eff, loc) =>
        mapN(visitExp(exp1), visitExp(exp2)) {
          case (e1, e2) => e1 + e2
        }
      case TypedAst.Expression.Let(sym, exp1, exp2, tpe, eff, loc) =>
        val letVal = visitExp(exp1)
        val expVal = visitExp(exp2)
        expVal match {
          case Validation.Success(value) =>
            if (!value.vars.contains(sym)) {
              println(value.vars);
              DeadCodeError(sym.loc, "Variable never used.").toFailure // Correct?
            } else {
              mapN(letVal, expVal) {
                case (l, e) => l + e
              }
            }
          case _ => // TODO: Improve/fix (the below repeats the above)
            mapN(letVal, expVal) {
              case (l, e) => l + e
            }
        }
      case TypedAst.Expression.LetRec(sym, exp1, exp2, tpe, eff, loc) =>
        // I just copied this from the above case
        val letVal = visitExp(exp1)
        val expVal = visitExp(exp2)
        if(!expVal.get.vars.contains(sym)) { // TODO: Account for case of Failure
          DeadCodeError(sym.loc, "Variable never used.").toFailure // Correct?
        } else {
          mapN(letVal, expVal) {
            case (l, ex) => (l + ex) - sym
          }
        }
      case TypedAst.Expression.IfThenElse(exp1, exp2, exp3, tpe, eff, loc) =>
        val condVal = visitExp(exp1)
        val thenVal = visitExp(exp2)
        val elseVal = visitExp(exp3)
        mapN(condVal, thenVal, elseVal) {
          case (c, t, ex) => c + t + ex
        }
      case TypedAst.Expression.Match(exp, rules, tpe, eff, loc) =>
        val matchVal = visitExp(exp)
        val rulesVal = traverse(rules) {
          case TypedAst.MatchRule(pat, guard, exp) =>
            val guardVal = visitExp(guard)
            val expVal = visitExp(exp)
            val patRes = patternVar(pat)
            val unusedSyms = patRes -- expVal.get.vars // TODO: Account for case of Failure
            if(unusedSyms.size == 0) {
              mapN(guardVal, expVal) {
                case (g, ex) => g + ex
              }
            } else {
              DeadCodeError(unusedSyms.head.loc, "Matching variable(s) not used in expression.").toFailure
            }
        }
        mapN(matchVal, rulesVal) {
          case (m, r) => m + (r.foldLeft(Used(Set.empty, Set.empty)) (_ + _))
        }
      case TypedAst.Expression.Switch(rules, tpe, eff, loc) => Used(Set.empty, Set.empty).toSuccess // TODO
      case TypedAst.Expression.Tag(sym, tag, exp, tpe, eff, loc) =>
        val expVal = visitExp(exp)
        val newTagVal = Used(Set.empty, Set((sym, tag))).toSuccess
        mapN(expVal, newTagVal) {
          case (ex, n) => ex + n
        }
      case TypedAst.Expression.Tuple(elms, tpe, eff, loc) =>
        val elmsVal = traverse(elms) { case elm => visitExp(elm) }
        mapN(elmsVal) {
          case ex => ex.foldLeft(Used(Set.empty, Set.empty)) (_ + _)
        }
      case TypedAst.Expression.RecordExtend(label, value, rest, tpe, eff, loc) =>
        mapN(visitExp(value), visitExp(rest)) {
          case (v, r) => v + r
        }
      case TypedAst.Expression.RecordRestrict(label, rest, tpe, eff, loc) => visitExp(rest)
      case TypedAst.Expression.ArrayLit(elms, tpe, eff, loc) =>
        val elmsVal = traverse(elms) { case elm => visitExp(elm) }
        mapN(elmsVal) {
          case ex => ex.foldLeft(Used(Set.empty, Set.empty)) (_ + _)
        }
      case TypedAst.Expression.ArrayNew(elm, len, tpe, eff, loc) =>
        mapN(visitExp(elm), visitExp(len)) {
          case (el, l) => el + l
        }
      case TypedAst.Expression.ArrayLoad(base, index, tpe, eff, loc) =>
        mapN(visitExp(base), visitExp(index)) {
          case (b, i) => b + i
        }
      case TypedAst.Expression.ArrayLength(base, tpe, eff, loc) => visitExp(base)
      case TypedAst.Expression.ArrayStore(base, index, elm, tpe, eff, loc) =>
        val baseVal = visitExp(base)
        val indexVal = visitExp(index)
        val elmVal = visitExp(elm)
        mapN(visitExp(base), visitExp(index), visitExp(elm)) {
          case (b, i, el) => b + i + el
        }
      case TypedAst.Expression.ArraySlice(base, beginIndex, endIndex, tpe, eff, loc) =>
        mapN(visitExp(base), visitExp(beginIndex), visitExp(endIndex)) {
          case (ba, be, en) => ba + be + en
        }
      case TypedAst.Expression.VectorLit(elms, tpe, eff, loc) =>
        val elmsVal = traverse(elms) { case elm => visitExp(elm) }
        mapN(elmsVal) {
          case ex => ex.foldLeft(Used(Set.empty, Set.empty)) (_ + _)
        }
      case TypedAst.Expression.VectorNew(elm, len, tpe, eff, loc) => visitExp(elm)
      case TypedAst.Expression.VectorLoad(base, index, tpe, eff, loc) => visitExp(base)
      case TypedAst.Expression.VectorStore(base, index, elm, tpe, eff, loc) =>
        mapN(visitExp(base), visitExp(elm)) {
          case (b, el) => b + el
        }
      case TypedAst.Expression.VectorLength(base, tpe, eff, loc) => visitExp(base)
      case TypedAst.Expression.VectorSlice(base, startIndex, endIndex, tpe, eff, loc) =>
        mapN(visitExp(base), visitExp(endIndex)) {
          case (b, en) => b + en
        }
      case TypedAst.Expression.Ref(exp, tpe, eff, loc) => visitExp(exp)
      case TypedAst.Expression.Deref(exp, tpe, eff, loc) => visitExp(exp)
      case TypedAst.Expression.Assign(exp1, exp2, tpe, eff, loc) =>
        mapN(visitExp(exp1), visitExp(exp2)) {
          case (e1, e2) => e1 + e2
        }
      case TypedAst.Expression.HandleWith(exp, bindings, tpe, eff, loc) => Used(Set.empty, Set.empty).toSuccess // TODO
      case TypedAst.Expression.Existential(fparam, exp, eff, loc) => Used(Set.empty, Set.empty).toSuccess // TODO
      case TypedAst.Expression.Universal(fparam, exp, eff, loc) => Used(Set.empty, Set.empty).toSuccess // TODO
      case TypedAst.Expression.Ascribe(exp, tpe, eff, loc) => visitExp(exp)
      case TypedAst.Expression.Cast(exp, tpe, eff, loc) => visitExp(exp)
      case TypedAst.Expression.NativeConstructor(constructor, args, tpe, eff, loc) => Used(Set.empty, Set.empty).toSuccess // TODO
      case TypedAst.Expression.TryCatch(exp, rules, tpe, eff, loc) => Used(Set.empty, Set.empty).toSuccess // TODO
      case TypedAst.Expression.NewChannel(exp, tpe, eff, loc) => visitExp(exp)
      case TypedAst.Expression.GetChannel(exp, tpe, eff, loc) => visitExp(exp)
      case TypedAst.Expression.PutChannel(exp1, exp2, tpe, eff, loc) =>
        mapN(visitExp(exp1), visitExp(exp2)) {
          case (e1, e2) => e1 + e2
        }
      case TypedAst.Expression.SelectChannel(rules, default, tpe, eff, loc) => Used(Set.empty, Set.empty).toSuccess // TODO
      case TypedAst.Expression.Spawn(exp, tpe, eff, loc) => visitExp(exp)
      case TypedAst.Expression.Sleep(exp, tpe, eff, loc) => visitExp(exp)
      case TypedAst.Expression.FixpointConstraint(c, tpe, eff, loc) => Used(Set.empty, Set.empty).toSuccess // TODO
      case TypedAst.Expression.FixpointCompose(exp1, exp2, tpe, eff, loc) =>
        mapN(visitExp(exp1), visitExp(exp2)) {
          case (e1, e2) => e1 + e2
        }
      case TypedAst.Expression.FixpointSolve(exp, tpe, eff, loc) => visitExp(exp)
      case TypedAst.Expression.FixpointProject(pred, exp, tpe, eff, loc) =>
        mapN(visitExp(pred.exp), visitExp(exp)) {
          case (p, ex) => p + ex
        }
      case TypedAst.Expression.FixpointEntails(exp1, exp2, tpe, eff, loc) =>
        mapN(visitExp(exp1), visitExp(exp2)) {
          case (e1, e2) => e1 + e2
        }
      case _ => Used(Set.empty, Set.empty).toSuccess
    }

  private def freeVar(exp: TypedAst.Expression): Set[Symbol.VarSym] =
    exp match {
      case TypedAst.Expression.Var(sym, tpe, eff, loc) => Set(sym)
      case TypedAst.Expression.Lambda(fparam, exp, tpe, eff, loc) => freeVar(exp)
      case TypedAst.Expression.Apply(exp1, exp2, tpe, eff, loc) => freeVar(exp1) ++ freeVar(exp2)
      case TypedAst.Expression.Unary(op, exp, tpe, eff, loc) => freeVar(exp)
      case TypedAst.Expression.Binary(op, exp1, exp2, tpe, eff, loc) => freeVar(exp1) ++ freeVar(exp2)
      case TypedAst.Expression.Let(sym, exp1, exp2, tpe, eff, loc) => (freeVar(exp1) ++ freeVar(exp2)) -- Set(sym)
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
        // TODO: Add FixPointConstraint
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
      case _ => Set.empty
    }
}

case class Used(vars: Set[Symbol.VarSym], tags: Set[(Symbol.EnumSym, String)]) {
  def +(that: Used): Used = Used(vars ++ that.vars, tags ++ that.tags)
  //def -(that: Used): Used = Used(vars -- that.vars, tags -- that.tags)
  def -(sym: Symbol.VarSym): Used = Used(vars - sym, tags)
  def empty(): Used = Used(Set.empty, Set.empty)
}